import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import {
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  expect,
  test,
} from "vitest";
let db: PGlite;
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const admin = id(1),
  teacher = id(2),
  student = id(3),
  otherAdmin = id(4),
  otherStudent = id(5),
  invitee = id(6),
  course = id(20),
  otherCourse = id(21),
  lesson = id(30),
  assignment = id(40),
  session = id(50);
let org: string, otherOrg: string;
async function as(user: string, role = "authenticated") {
  await db.exec(`reset role;set role ${role};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
}
async function rpc(name: string, args: unknown[] = []) {
  return db.query(
    `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as result`,
    args,
  );
}
const act = (action: unknown, o = org) =>
  rpc("apply_action", [o, JSON.stringify(action)]);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to public;`,
  );
  for (const file of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const [i, name] of [
    [1, "Admin"],
    [2, "Teacher"],
    [3, "Student"],
    [4, "OtherAdmin"],
    [5, "OtherStudent"],
    [6, "Invitee"],
  ] as const)
    await db.query(
      `insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)`,
      [id(i), `${name.toLowerCase()}@example.com`, JSON.stringify({ name })],
    );
  await as(admin);
  org = (await rpc("create_organization", ["Alpha Academy", "alpha-academy"]))
    .rows[0].result as string;
  await as(otherAdmin);
  otherOrg = (
    await rpc("create_organization", ["Beta Academy", "beta-academy"])
  ).rows[0].result as string;
  await db.exec("reset role");
  await db.query(
    `insert into public.memberships("orgId","userId",name,email,role) values($1,$2,'Teacher','teacher@example.com','teacher'),($1,$3,'Student','student@example.com','student'),($4,$5,'OtherStudent','otherstudent@example.com','student')`,
    [org, teacher, student, otherOrg, otherStudent],
  );
  await as(admin);
  await act({
    type: "course",
    course: {
      id: course,
      orgId: org,
      title: "Algebra",
      subject: "Math",
      grade: "9",
      batch: "A",
      description: "Equations",
      color: "sage",
      teacherId: teacher,
    },
  });
  await act({
    type: "enroll",
    courseId: course,
    studentId: student,
    enrolled: true,
  });
  await act({
    type: "feature",
    orgId: org,
    feature: "assessments",
    enabled: true,
  });
  await act({
    type: "feature",
    orgId: org,
    feature: "attendance",
    enabled: true,
  });
  await act({
    type: "lesson",
    lesson: {
      id: lesson,
      orgId: org,
      courseId: course,
      title: "Equations",
      duration: 20,
      age: "13–15",
      subject: "Math",
    },
  });
  await act({
    type: "assignment",
    assignment: {
      id: assignment,
      orgId: org,
      courseId: course,
      title: "Solve",
      prompt: "Explain x + 2 = 4",
      due: "2026-12-01",
      points: 10,
    },
  });
  await act({
    type: "session",
    session: {
      id: session,
      orgId: org,
      courseId: course,
      title: "Now",
      date: "2026-09-22",
      time: "10:00",
      startsAt: new Date().toISOString(),
      duration: 60,
    },
  });
  await as(otherAdmin);
  await act(
    {
      type: "course",
      course: {
        id: otherCourse,
        orgId: otherOrg,
        title: "Biology",
        subject: "Science",
        grade: "9",
        batch: "B",
        description: "Cells",
        color: "sage",
        teacherId: otherAdmin,
      },
    },
    otherOrg,
  );
  await db.exec("reset role");
}, 30000);
beforeEach(async () => {
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("rollback;reset role;");
});
afterAll(async () => {
  await db.close();
});
test("students cannot read another organization or unassigned course", async () => {
  await as(student);
  const result = await db.query("select id from public.courses");
  expect(result.rows).toEqual([{ id: course }]);
  expect((await db.query("select id from public.organizations")).rows).toEqual([
    { id: org },
  ]);
});
test("teachers cannot read unassigned classes or other organizations", async () => {
  await as(teacher);
  expect((await db.query("select id from public.courses")).rows).toEqual([
    { id: course },
  ]);
});
test("students cannot read peer profiles or draft recordings", async () => {
  await as(student);
  expect(
    (await db.query('select "userId" from public.memberships')).rows,
  ).toEqual([{ userId: student }]);
  expect((await db.query("select id from public.lessons")).rows).toEqual([]);
});
test("direct REST-style writes cannot bypass trusted operations", async () => {
  await as(admin);
  await expect(
    db.query("update public.memberships set role='teacher-admin'"),
  ).rejects.toThrow(/permission denied/);
});
test("students cannot escalate membership or change branding", async () => {
  await as(student);
  await expect(
    act({
      type: "membership",
      userId: student,
      role: "teacher-admin",
      active: true,
    }),
  ).rejects.toThrow();
});
test("teachers cannot change organization configuration", async () => {
  await as(teacher);
  await expect(act({ type: "rename", name: "Hijacked" })).rejects.toThrow();
});
test("forged organization IDs cannot create cross-tenant resources", async () => {
  await as(admin);
  await expect(
    act({
      type: "lesson",
      lesson: {
        id: id(99),
        orgId: org,
        courseId: otherCourse,
        title: "Attack",
        duration: 1,
        age: "all",
        subject: "x",
      },
    }),
  ).rejects.toThrow();
});
test("admin cannot enroll a member from another organization", async () => {
  await as(admin);
  await expect(
    act({
      type: "enroll",
      courseId: course,
      studentId: otherStudent,
      enrolled: true,
    }),
  ).rejects.toThrow();
});
test("admin cannot remove the last active administrator", async () => {
  await as(admin);
  await expect(
    act({ type: "membership", userId: admin, role: "teacher", active: true }),
  ).rejects.toThrow(/at least one/);
});
test("revoked members lose read access with the same auth identity", async () => {
  await as(admin);
  await act({
    type: "membership",
    userId: student,
    role: "student",
    active: false,
  });
  await as(student);
  expect((await db.query("select id from public.courses")).rows).toEqual([]);
});
test("feature disabling preserves records but denies reads", async () => {
  await as(admin);
  await act({
    type: "feature",
    orgId: org,
    feature: "assessments",
    enabled: false,
  });
  expect((await db.query("select id from public.assignments")).rows).toEqual(
    [],
  );
  await db.exec("reset role");
  expect(
    (await db.query("select id from public.assignments")).rows.length,
  ).toBe(1);
});
test("branding saves for only the selected tenant", async () => {
  await as(admin);
  await act({
    type: "branding",
    branding: {
      primaryColor: "#663399",
      accentColor: "#ffeedd",
      fontFamily: "serif",
      fontSize: 20,
      theme: "dark",
      tagline: "Learn freely",
      logoUrl: "",
    },
  });
  await db.exec("reset role");
  const result = await db.query(
    "select branding from public.organizations where id=$1",
    [otherOrg],
  );
  expect((result.rows[0].branding as any).fontSize).toBe(16);
});
test("invalid logo protocols and arbitrary CSS cannot enter branding", async () => {
  await as(admin);
  await expect(
    act({
      type: "branding",
      branding: {
        primaryColor: "url(https://evil.invalid)",
        accentColor: "#ffeedd",
        fontFamily: "serif",
        fontSize: 16,
        theme: "light",
        tagline: "x",
        logoUrl: "javascript:alert(1)",
      },
    }),
  ).rejects.toThrow(/branding/);
});
test("invitation binds verified email, is single-use, and enrolls transactionally", async () => {
  await as(admin);
  const token = (
    await rpc("create_invitation", [
      org,
      "invitee@example.com",
      "New Learner",
      "student",
      course,
    ])
  ).rows[0].result;
  await as(invitee);
  await rpc("accept_invitation", [token]);
  expect((await db.query("select id from public.courses")).rows).toEqual([
    { id: course },
  ]);
  await expect(rpc("accept_invitation", [token])).rejects.toThrow(/used/);
});
test("invitation for another email cannot be accepted", async () => {
  await as(admin);
  const token = (
    await rpc("create_invitation", [
      org,
      "invitee@example.com",
      "New",
      "student",
      null,
    ])
  ).rows[0].result;
  await as(student);
  await expect(rpc("accept_invitation", [token])).rejects.toThrow(
    /another email/,
  );
});
test("expired invitations grant no membership", async () => {
  await as(admin);
  const token = (
    await rpc("create_invitation", [
      org,
      "invitee@example.com",
      "New",
      "student",
      null,
    ])
  ).rows[0].result;
  await db.exec("reset role");
  await db.query(
    "update public.invitations set \"expiresAt\"=now()-interval '1 day'",
  );
  await as(invitee);
  await expect(rpc("accept_invitation", [token])).rejects.toThrow(/expired/);
});
test("revoked invitations grant no membership", async () => {
  await as(admin);
  const token = (
    await rpc("create_invitation", [
      org,
      "invitee@example.com",
      "New",
      "student",
      null,
    ])
  ).rows[0].result;
  const invitation = (await db.query("select id from public.invitations"))
    .rows[0].id;
  await rpc("revoke_invitation", [invitation]);
  await as(invitee);
  await expect(rpc("accept_invitation", [token])).rejects.toThrow(/revoked/);
});
test("invitation hashes cannot be read through the browser", async () => {
  await as(admin);
  await expect(
    db.query('select "tokenHash" from public.invitations'),
  ).rejects.toThrow(/permission denied/);
});
test("submission and grading persist and revisions clear grades", async () => {
  await as(student);
  await act({ type: "submit", id: assignment, answer: "x = 2" });
  const sub = (await db.query("select id from public.submissions")).rows[0].id;
  await as(teacher);
  await act({ type: "grade", id: sub, score: 10, feedback: "Well explained" });
  await as(student);
  expect(
    (await db.query("select score,published from public.submissions")).rows[0],
  ).toEqual({ score: "10", published: true });
  await act({ type: "submit", id: assignment, answer: "x = 4 - 2 = 2" });
  expect(
    (await db.query("select score,published from public.submissions")).rows[0],
  ).toEqual({ score: null, published: false });
});
test("publishing requires ready media and explicit review", async () => {
  await as(teacher);
  await expect(
    act({
      type: "lesson-status",
      id: lesson,
      status: "published",
      reviewed: true,
    }),
  ).rejects.toThrow(/review/);
});
test("students cannot authorize uploads or invoke service callbacks", async () => {
  await as(student);
  await expect(rpc("media_access", [lesson, "upload"])).rejects.toThrow();
});
test("anonymous callers receive only public branding", async () => {
  await as("", "anon");
  const brand = (await rpc("organization_brand", ["alpha-academy"])).rows[0]
    .result as object;
  expect(Object.keys(brand).sort()).toEqual(["branding", "name"]);
  await expect(db.query("select * from public.memberships")).rejects.toThrow(
    /permission denied/,
  );
});
test("live access grants students no owner capability", async () => {
  await as(student);
  const data = (await rpc("media_access", [session, "join"])).rows[0]
    .result as any;
  expect(data.owner).toBe(false);
});
test("attendance rejects non-enrolled students", async () => {
  await as(teacher);
  await expect(
    act({
      type: "attendance",
      sessionId: session,
      values: { [otherStudent]: "present" },
    }),
  ).rejects.toThrow();
});
test("audit entries avoid storing student answers", async () => {
  await as(student);
  await act({ type: "submit", id: assignment, answer: "Private answer" });
  await as(admin);
  const result = await db.query("select * from public.audit_events");
  expect(JSON.stringify(result.rows)).not.toContain("Private answer");
  expect(result.rows.some((r: any) => r.action === "submit")).toBe(true);
});

test("students cannot call privileged media callbacks directly", async () => {
  await as(student);
  await expect(
    rpc("media_upload_saved", [lesson, "upload", "https://upload.invalid"]),
  ).rejects.toThrow(/permission denied/);
});
test("verified webhook callbacks are idempotent and ready videos can be published", async () => {
  await as("", "service_role");
  await rpc("media_upload_saved", [
    lesson,
    "upload-1",
    "https://upload.invalid",
  ]);
  const payload = JSON.stringify({
    id: "asset-1",
    upload_id: "upload-1",
    playback_ids: [{ id: "signed-id", policy: "signed" }],
  });
  await rpc("media_webhook_apply", ["event-1", "video.asset.ready", payload]);
  await rpc("media_webhook_apply", ["event-1", "video.asset.ready", payload]);
  await db.exec("reset role");
  expect(
    (await db.query("select id from private.webhook_events")).rows.length,
  ).toBe(1);
  await as(teacher);
  await act({
    type: "lesson-status",
    id: lesson,
    status: "review",
    reviewed: false,
  });
  await act({
    type: "lesson-status",
    id: lesson,
    status: "published",
    reviewed: true,
  });
  await as(student);
  const data = (await rpc("media_access", [lesson, "playback"])).rows[0]
    .result as Record<string, unknown>;
  expect(data.playbackId).toBe("signed-id");
  expect(data).not.toHaveProperty("uploadUrl");
});
test("withdrawn lessons immediately deny new playback access", async () => {
  await db.exec("reset role");
  await db.query(
    `update public.lessons set "mediaStatus"='ready',status='published' where id=$1`,
    [lesson],
  );
  await as(teacher);
  await act({
    type: "lesson-status",
    id: lesson,
    status: "draft",
    reviewed: false,
  });
  await as(student);
  await expect(rpc("media_access", [lesson, "playback"])).rejects.toThrow();
});
test("students cannot read a classmate’s private submission", async () => {
  await db.exec("reset role");
  await db.query(
    `insert into public.memberships("orgId","userId",name,email,role) values($1,$2,'Peer','invitee@example.com','student')`,
    [org, invitee],
  );
  await db.query(
    `insert into public.enrollments("orgId","courseId","studentId") values($1,$2,$3)`,
    [org, course, invitee],
  );
  await as(invitee);
  await act({ type: "submit", id: assignment, answer: "My private answer" });
  await as(student);
  expect((await db.query("select * from public.submissions")).rows).toEqual([]);
});
test("closed sessions cannot issue new meeting access", async () => {
  await db.exec("reset role");
  await db.query(
    `update public.sessions set "startsAt"=now()-interval '1 day' where id=$1`,
    [session],
  );
  await as(student);
  await expect(rpc("media_access", [session, "join"])).rejects.toThrow(/opens/);
});
test("platform role grants metadata administration, not tenant classroom access", async () => {
  await db.exec("reset role");
  await db.query('insert into public.platform_admins("userId") values($1)', [
    invitee,
  ]);
  await as(invitee);
  expect((await rpc("my_access")).rows[0].result).toMatchObject({
    platform: true,
  });
  expect((await db.query("select * from public.courses")).rows).toEqual([]);
  await act(
    { type: "feature", orgId: otherOrg, feature: "recordings", enabled: false },
    otherOrg,
  );
});
test("suspended organizations remain identifiable but grant no learning access", async () => {
  await db.exec("reset role");
  await db.query("update public.organizations set active=false where id=$1", [
    org,
  ]);
  await as(student);
  const data = (await rpc("my_access")).rows[0].result as {
    orgs: { id: string; active: boolean }[];
  };
  expect(data.orgs[0]).toMatchObject({ id: org, active: false });
  expect((await db.query("select * from public.courses")).rows).toEqual([]);
});

test.each(["video", "audio", "document", "link", "notes"])(
  "%s lessons can be withdrawn and republished without processed media",
  async (type) => {
    await as(teacher);
    const newId = id(90);
    await act({
      type: "lesson",
      lesson: {
        id: newId,
        orgId: org,
        courseId: course,
        title: "Reference lesson",
        duration: 10,
        age: "13–15",
        subject: "Math",
        type,
        url: type === "notes" ? "" : "https://example.com/lesson.pdf",
        content: type === "notes" ? "Review equations" : "",
        status: "published",
      },
    });
    await act({
      type: "lesson-status",
      id: newId,
      status: "draft",
      reviewed: false,
    });
    await as(student);
    expect(
      (await db.query("select id from public.lessons where id=$1", [newId]))
        .rows,
    ).toHaveLength(0);
    await as(teacher);
    await act({
      type: "lesson-status",
      id: newId,
      status: "review",
      reviewed: false,
    });
    await db.exec("savepoint denied_action");
    await expect(
      act({
        type: "lesson-status",
        id: newId,
        status: "published",
        reviewed: false,
      }),
    ).rejects.toThrow(/review/);
    await db.exec("rollback to savepoint denied_action");
    await act({
      type: "lesson-status",
      id: newId,
      status: "published",
      reviewed: true,
    });
    await as(student);
    expect(
      (await db.query("select status from public.lessons where id=$1", [newId]))
        .rows,
    ).toEqual([{ status: "published" }]);
  },
);

test("references persist with lesson visibility and only course editors can change them", async () => {
  const reference = {
    id: "ref-1",
    type: "notes",
    title: "Study notes",
    content: "Remember to balance both sides.",
  };
  await as(teacher);
  await act({ type: "lesson-reference", id: lesson, reference });
  expect(
    (
      await db.query('select "references" from public.lessons where id=$1', [
        lesson,
      ])
    ).rows[0].references,
  ).toEqual([reference]);
  await as(student);
  await db.exec("savepoint denied_action");
  await expect(
    act({ type: "lesson-reference", id: lesson, reference }),
  ).rejects.toThrow();
  await db.exec("rollback to savepoint denied_action");
  await db.exec("savepoint denied_action");
  await expect(
    act({
      type: "remove-lesson-reference",
      id: lesson,
      referenceId: reference.id,
    }),
  ).rejects.toThrow();
  await db.exec("rollback to savepoint denied_action");
  await as(otherAdmin);
  await db.exec("savepoint denied_action");
  await expect(
    act({ type: "lesson-reference", id: lesson, reference }, otherOrg),
  ).rejects.toThrow();
  await db.exec("rollback to savepoint denied_action");
  await as(teacher);
  await db.exec("savepoint denied_action");
  await expect(
    act({
      type: "lesson-reference",
      id: lesson,
      reference: { ...reference, type: "link", url: "javascript:alert(1)" },
    }),
  ).rejects.toThrow();
  await db.exec("rollback to savepoint denied_action");
  await act({
    type: "remove-lesson-reference",
    id: lesson,
    referenceId: reference.id,
  });
  expect(
    (
      await db.query('select "references" from public.lessons where id=$1', [
        lesson,
      ])
    ).rows[0].references,
  ).toEqual([]);
});

test("profile name changes sync memberships without changing access or other members", async () => {
  await db.exec("reset role");
  await db.query(
    `insert into public.memberships("orgId","userId",name,email,role) values($1,$2,'Student','student@example.com','student')`,
    [otherOrg, student],
  );
  // Auth updates metadata for the authenticated account, then this trigger runs.
  await db.query(`update auth.users set raw_user_meta_data=$1 where id=$2`, [
    JSON.stringify({
      name: "New learner name",
      headline: "Learning algebra",
      role: "super-admin",
    }),
    student,
  ]);
  const memberships = await db.query(
    'select name,role from public.memberships where "userId"=$1',
    [student],
  );
  expect(memberships.rows).toEqual([
    { name: "New learner name", role: "student" },
    { name: "New learner name", role: "student" },
  ]);
  expect(
    (
      await db.query('select name from public.memberships where "userId"=$1', [
        teacher,
      ])
    ).rows[0].name,
  ).toBe("Teacher");
  await as(student);
  await expect(
    act({ type: "rename", name: "Not permitted" }),
  ).rejects.toThrow();
});

test("profile name validation rejects blank names atomically", async () => {
  await db.exec("reset role;savepoint profile_change");
  await expect(
    db.query(`update auth.users set raw_user_meta_data=$1 where id=$2`, [
      JSON.stringify({ name: "   " }),
      student,
    ]),
  ).rejects.toThrow(/display name/);
  await db.exec("rollback to savepoint profile_change");
  expect(
    (
      await db.query('select name from public.memberships where "userId"=$1', [
        student,
      ])
    ).rows[0].name,
  ).toBe("Student");
});
