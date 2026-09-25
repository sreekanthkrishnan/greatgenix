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
  // Existing classroom fixtures have approved, paid access; new signup is tested separately.
  await db.query("update public.organizations set approval_status='approved' where id in ($1,$2)", [org,otherOrg]);
  await db.query(`insert into public.subscription_plans(id,name,price_minor,currency,duration_days,features) values($1,'Test plan',1000,'INR',30,'{"live":true,"recordings":true,"attendance":true,"assessments":true}')`, [id(80)]);
  await db.query(`insert into public.organization_subscriptions(org_id,plan_id,plan_name,price_minor,total_minor,currency,duration_days,features,status,starts_at,ends_at) select id,$1,'Test plan',1000,1000,'INR',30,'{"live":true,"recordings":true,"attendance":true,"assessments":true}','active',now(),now()+interval '30 days' from public.organizations`, [id(80)]);
  await db.query(
    `insert into public.memberships("orgId","userId",name,email,role) values($1,$2,'Teacher','teacher@example.com','teacher'),($1,$3,'Student','student@example.com','student'),($4,$5,'OtherStudent','otherstudent@example.com','student')`,
    [org, teacher, student, otherOrg, otherStudent],
  );
  await as(teacher);
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
test("subscription entitlements deny reads without deleting records", async () => {
  await db.exec("reset role");
  await db.query(`update public.organization_subscriptions set features=features || '{"assessments":false}' where org_id=$1`, [org]);
  await as(admin);
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
  await expect(act({ type: "feature", orgId: otherOrg, feature: "recordings", enabled: false }, otherOrg)).rejects.toThrow(/subscription/);
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

test("organization and platform administrator roles are independent and can coexist", async () => {
  await as(admin);
  expect((await rpc("my_access")).rows[0].result).toMatchObject({
    platform: false,
    memberships: [{ orgId: org, role: "teacher-admin" }],
  });
  await db.exec("reset role");
  await db.query('insert into public.platform_admins("userId") values($1)', [
    admin,
  ]);
  await as(admin);
  expect((await rpc("my_access")).rows[0].result).toMatchObject({
    platform: true,
    memberships: [{ orgId: org, role: "teacher-admin" }],
  });
  expect((await db.query("select id from public.courses")).rows).toEqual([
    { id: course },
  ]);
  await db.exec("reset role");
  await db.query('delete from public.platform_admins where "userId"=$1', [
    admin,
  ]);
  await as(admin);
  expect((await rpc("my_access")).rows[0].result).toMatchObject({
    platform: false,
    memberships: [{ orgId: org, role: "teacher-admin" }],
  });
  await expect(act({ type: "org-status", orgId: otherOrg })).rejects.toThrow();
});

async function billingSetup() {
  await db.exec('reset role');
  await db.query('insert into public.platform_admins("userId") values($1)', [invitee]);
  await db.query('delete from public.organization_subscriptions');
  await as(invitee);
}
async function denied(operation: () => Promise<unknown>, message?: RegExp) {
  await db.exec('savepoint billing_denied');
  await expect(operation()).rejects.toThrow(message);
  await db.exec('rollback to savepoint billing_denied');
}
async function coupon(overrides: Record<string, unknown> = {}) {
  return (await rpc('save_subscription_coupon', [JSON.stringify({
    code: 'WELCOME', percent_off: 50, bonus_features: { assessments: true },
    starts_at: '2020-01-01T00:00:00Z', expires_at: '2099-01-01T00:00:00Z', max_redemptions: 1,
    ...overrides,
  })])).rows[0].result as string;
}
async function accessOrg(o = org) {
  const access = (await rpc('my_access')).rows[0].result as {orgs: {id:string; accessible:boolean; features:Record<string,boolean>; billing_status:string}[]};
  return access.orgs.find(g => g.id === o)!;
}
test('new organization requires platform review and a subscription before classroom access', async () => {
  await billingSetup();
  await as(teacher);
  const fresh = (await rpc('create_organization', ['New School','new-school'])).rows[0].result as string;
  expect(await accessOrg(fresh)).toMatchObject({accessible:false,billing_status:'pending'});
  await denied(() => rpc('review_organization',[fresh,true,'']), /Platform administrator/);
  await denied(() => rpc('request_subscription',[fresh,id(80),'']), /approved/);
  await denied(() => act({type:'course',course:{id:id(90),orgId:fresh,title:'Blocked'}},fresh));
  await as(invitee);
  await rpc('review_organization',[fresh,true,'Verified school']);
  await as(teacher);
  expect(await accessOrg(fresh)).toMatchObject({accessible:false,billing_status:'subscription_required'});
});
test('paid subscriptions activate only on platform payment confirmation and preserve quoted terms', async () => {
  await billingSetup();
  await coupon();
  await as(admin);
  const sub = (await rpc('request_subscription',[org,id(80),' welcome '])).rows[0].result;
  expect(await accessOrg()).toMatchObject({accessible:false,billing_status:'pending_payment'});
  expect((await db.query('select id from public.courses')).rows).toEqual([]);
  await denied(() => rpc('confirm_subscription_payment',[sub,'FAKE']), /Platform administrator/);
  await denied(() => rpc('request_subscription',[org,id(80),'']), /already exists/);
  await as(invitee);
  await rpc('save_subscription_plan',[JSON.stringify({id:id(80),name:'Changed',price_minor:9000,currency:'USD',duration_days:365,features:{},active:false})]);
  await denied(() => rpc('confirm_subscription_payment',[sub,' ']), /reference/);
  await rpc('confirm_subscription_payment',[sub,'BANK-123']);
  const saved = (await db.query('select * from public.organization_subscriptions where id=$1',[sub])).rows[0];
  expect(saved).toMatchObject({total_minor:500,currency:'INR',duration_days:30,plan_name:'Test plan',payment_reference:'BANK-123',confirmed_by:invitee});
  await denied(() => rpc('confirm_subscription_payment',[sub,'DUPLICATE']), /not awaiting/);
  await as(admin);
  expect((await accessOrg()).accessible).toBe(true);
  expect((await db.query('select id from public.courses')).rows).toEqual([{id:course}]);
});
test('fully discounted coupons activate bonus features automatically, including live attendance dependency', async () => {
  await billingSetup();
  await rpc('save_subscription_plan',[JSON.stringify({id:id(80),name:'Core',price_minor:1000,currency:'INR',duration_days:30,features:{},active:true})]);
  await coupon({percent_off:100,bonus_features:{attendance:true,assessments:true}});
  await as(admin);
  const sub = (await rpc('request_subscription',[org,id(80),'WELCOME'])).rows[0].result;
  expect(await accessOrg()).toMatchObject({accessible:true,features:{live:true,attendance:true,assessments:true,recordings:false}});
  expect((await db.query('select total_minor,status from public.organization_subscriptions where id=$1',[sub])).rows[0]).toEqual({total_minor:0,status:'active'});
  await denied(() => rpc('cancel_subscription',[sub]), /platform admins/);
  await as(invitee);
  await rpc('cancel_subscription',[sub]);
  await as(admin);
  expect((await accessOrg()).accessible).toBe(false);
});
test.each([
  {active:false}, {expires_at:'2021-01-01T00:00:00Z'},
  {starts_at:'2098-01-01T00:00:00Z'}, {org_id:'other'}, {plan_id:'other'},
])('coupon rejects ineligible conditions %j', async (condition) => {
  await billingSetup();
  if ('org_id' in condition) condition = {...condition,org_id:otherOrg};
  if ('plan_id' in condition) {
    const plan = (await rpc('save_subscription_plan',[JSON.stringify({name:'Other',price_minor:2000,currency:'INR',duration_days:30,features:{}})])).rows[0].result;
    condition = {...condition,plan_id:plan as string};
  }
  await coupon(condition);
  await as(admin);
  await denied(() => rpc('quote_subscription',[org,id(80),'WELCOME']), /invalid, expired, or not eligible/);
});
test('coupon reservations enforce global limits, release on cancellation, and prevent reuse', async () => {
  await billingSetup();
  await coupon();
  await as(admin);
  const sub = (await rpc('request_subscription',[org,id(80),'WELCOME'])).rows[0].result;
  await as(otherAdmin);
  await denied(() => rpc('quote_subscription',[otherOrg,id(80),'WELCOME']), /limit reached/);
  await as(admin);
  await rpc('cancel_subscription',[sub]);
  const next = (await rpc('request_subscription',[org,id(80),'WELCOME'])).rows[0].result;
  await as(invitee);
  await rpc('confirm_subscription_payment',[next,'BANK-OK']);
  await db.exec('reset role');
  await db.query("update public.organization_subscriptions set starts_at=now()-interval '40 days',ends_at=now()-interval '10 days' where id=$1",[next]);
  await as(admin);
  expect((await accessOrg()).accessible).toBe(false);
  await denied(() => rpc('request_subscription',[org,id(80),'WELCOME']), /already used/);
});
test('billing permissions prevent self approval, price changes, direct writes and cross organization requests', async () => {
  await billingSetup();
  await coupon();
  await as(admin);
  await denied(() => rpc('save_subscription_plan',['{}']), /Platform administrator/);
  await denied(() => rpc('save_subscription_coupon',['{}']), /Platform administrator/);
  await denied(() => rpc('review_organization',[org,true,'']), /Platform administrator/);
  await denied(() => db.query("update public.organizations set approval_status='approved' where id=$1",[org]));
  await denied(() => db.query("update public.subscription_plans set price_minor=0"));
  await denied(() => db.query("update public.organization_subscriptions set status='active'"));
  await denied(() => rpc('request_subscription',[otherOrg,id(80),'']), /Organization administrator/);
  expect((await db.query('select * from public.subscription_coupons')).rows).toEqual([]);
  await as(student);
  await denied(() => rpc('quote_subscription',[org,id(80),'']), /Organization administrator/);
  expect((await db.query('select * from public.organization_subscriptions')).rows).toEqual([]);
});
test('rejection and suspension revoke paid access while billing remains readable to owner', async () => {
  await billingSetup();
  await as(admin);
  const sub = (await rpc('request_subscription',[org,id(80),''])).rows[0].result;
  await as(invitee);
  await rpc('confirm_subscription_payment',[sub,'RECEIPT']);
  await rpc('review_organization',[org,false,'Review failed']);
  await as(admin);
  expect(await accessOrg()).toMatchObject({accessible:false,billing_status:'rejected'});
  expect((await db.query('select id from public.organization_subscriptions')).rows).toEqual([{id:sub}]);
  await as(invitee);
  await rpc('review_organization',[org,true,'']);
  await act({type:'org-status',orgId:org});
  await as(admin);
  expect((await accessOrg()).accessible).toBe(false);
});

async function courseTerms(visibility = 'public', pricing = 'paid') {
  await as(teacher);
  await act({type:'course-access', id:course, visibility, pricing, coursePrice:5000, discountedPrice:null});
  await act({type:'enroll', courseId:course, studentId:student, enrolled:false});
}
async function publishPreview(preview = true) {
  await db.exec('reset role');
  await db.query(`update public.lessons set status='published',"mediaStatus"='ready',"isFreePreview"=$1,url='https://example.com/protected',content='Protected notes',"references"='[{"id":"private-notes","type":"notes","title":"Notes","content":"Protected reference"}]' where id=$2`,[preview,lesson]);
}
test('course creation uses the authenticated teacher and rejects cross-organization creation', async () => {
  await as(teacher);
  const data = {id:id(90),orgId:org,title:'Open course',subject:'Math',grade:'9',batch:'A',description:'Preview',color:'sage',teacherId:teacher,visibility:'public',pricing:'paid',coursePrice:5000,discountedPrice:null};
  await act({type:'course',course:data});
  expect((await db.query('select visibility,pricing from public.courses where id=$1',[id(90)])).rows[0]).toEqual({visibility:'public',pricing:'paid'});
  await act({type:'course',course:{...data,id:id(91),teacherId:admin}});
  expect((await db.query('select "teacherId" from public.courses where id=$1',[id(91)])).rows[0].teacherId).toBe(teacher);
  await as(admin);
  await act({type:'course',course:{...data,id:id(92),teacherId:teacher}});
  expect((await db.query('select "teacherId" from public.courses where id=$1',[id(92)])).rows[0].teacherId).toBe(admin);
  await as(teacher);
  await denied(() => act({type:'course',course:{...data,id:id(91),orgId:otherOrg}},otherOrg));
  await as(student);
  await denied(() => act({type:'course',course:{...data,id:id(91),teacherId:student}}));
});
test.each(['free','paid'])('public %s courses are discoverable only by active organization students', async (pricing) => {
  await courseTerms('public',pricing);
  await as(student);
  expect((await db.query('select id from public.courses')).rows).toEqual([{id:course}]);
  await as(otherStudent);
  expect((await db.query('select id from public.courses where id=$1',[course])).rows).toEqual([]);
  await db.exec('reset role');
  await db.query('update public.memberships set active=false where "orgId"=$1 and "userId"=$2',[org,student]);
  await as(student);
  expect((await db.query('select id from public.courses')).rows).toEqual([]);
});
test('public free courses allow all published lessons, assessments, and live access without enrollment', async () => {
  await courseTerms('public','free'); await publishPreview(false); await as(student);
  expect((await db.query('select id from public.lessons')).rows).toEqual([{id:lesson}]);
  expect((await db.query('select id from public.assignments')).rows).toEqual([{id:assignment}]);
  expect((await db.query('select id from public.sessions')).rows).toEqual([{id:session}]);
  await rpc('media_access',[lesson,'playback']);
  await rpc('media_access',[session,'join']);
  await act({type:'complete',id:lesson});
});
test('paid previews expose only published preview content and cannot bypass full access by ID', async () => {
  await courseTerms(); await publishPreview(false); await as(student);
  expect((await db.query('select * from public.lessons')).rows).toEqual([]);
  expect((await db.query('select * from public.sessions')).rows).toEqual([]);
  expect((await db.query('select * from public.assignments')).rows).toEqual([]);
  await denied(() => rpc('media_access',[lesson,'playback']));
  await denied(() => rpc('media_access',[session,'join']));
  await denied(() => act({type:'complete',id:lesson}));
  await denied(() => act({type:'submit',id:assignment,answer:'Bypass'}));
  await denied(() => act({type:'report',lessonId:lesson,reason:'Bypass'}));
  await as(teacher); await act({type:'lesson-preview',id:lesson,isFreePreview:true});
  await as(student);
  expect((await db.query('select id,"references" from public.lessons')).rows[0]).toMatchObject({id:lesson,references:[{id:'private-notes'}]});
  await rpc('media_access',[lesson,'playback']);
  await act({type:'complete',id:lesson});
  await act({type:'report',lessonId:lesson,reason:'Preview feedback'});
  await denied(() => act({type:'lesson-preview',id:lesson,isFreePreview:false}));
  await as(teacher); await act({type:'lesson-status',id:lesson,status:'draft',reviewed:false});
  await as(student);
  expect((await db.query('select * from public.lessons')).rows).toEqual([]);
  await denied(() => rpc('media_access',[lesson,'playback']));
});
test('private course previews remain private and teacher invitations remain student-only', async () => {
  await courseTerms('private','free'); await publishPreview(); await as(student);
  expect((await db.query('select id from public.courses')).rows).toEqual([]);
  expect((await db.query('select id from public.lessons')).rows).toEqual([]);
  await denied(() => rpc('media_access',[lesson,'playback']));
  await as(teacher);
  const token = (await rpc('create_invitation',[org,'invitee@example.com','Invitee','student',course])).rows[0].result;
  await denied(() => rpc('create_invitation',[org,'invitee@example.com','Invitee','teacher-admin',course]));
  await denied(() => rpc('create_invitation',[otherOrg,'invitee@example.com','Invitee','student',otherCourse]));
  await as(invitee); await rpc('accept_invitation',[token]);
  expect((await db.query('select id from public.lessons')).rows).toEqual([{id:lesson}]);
});
test('manual direct grants unlock paid content and removal revokes access and outstanding coupons', async () => {
  await courseTerms(); await publishPreview(false); await as(teacher);
  const token = (await rpc('create_course_access_coupon',[org,course,student])).rows[0].result;
  await act({type:'enroll',courseId:course,studentId:student,enrolled:true});
  await as(student);
  expect((await db.query('select id from public.lessons')).rows).toEqual([{id:lesson}]);
  await rpc('media_access',[session,'join']);
  await denied(() => act({type:'enroll',courseId:course,studentId:student,enrolled:true}));
  await as(teacher); await act({type:'enroll',courseId:course,studentId:student,enrolled:false});
  await as(student);
  expect((await db.query('select * from public.lessons')).rows).toEqual([]);
  await denied(() => rpc('redeem_course_access_coupon',[org,course,token]));
});
test('course coupons are student-bound, single-use, and do not expose tokens through tables or audit', async () => {
  await courseTerms(); await publishPreview(false); await as(teacher);
  const token = (await rpc('create_course_access_coupon',[org,course,student])).rows[0].result as string;
  const listing = (await rpc('list_course_access_coupons',[org,course])).rows[0].result as any[];
  expect(listing).toHaveLength(1); expect(JSON.stringify(listing)).not.toContain(token);
  await as(otherStudent); await denied(() => rpc('redeem_course_access_coupon',[org,course,token]));
  await as(student);
  await denied(() => rpc('list_course_access_coupons',[org,course]));
  await denied(() => db.query('select * from private.course_access_coupons'));
  await denied(() => rpc('redeem_course_access_coupon',[org,otherCourse,token]));
  await rpc('redeem_course_access_coupon',[org,course,` ${token.toUpperCase()} `]);
  expect((await db.query('select id from public.lessons')).rows).toEqual([{id:lesson}]);
  await denied(() => rpc('redeem_course_access_coupon',[org,course,token]));
  await as(admin); expect(JSON.stringify((await db.query('select * from public.audit_events')).rows)).not.toContain(token);
});
test.each(['expired','revoked','replaced','inactive','changed-terms'])('course coupons reject %s redemption', async (condition) => {
  await courseTerms(); await as(teacher);
  const token = (await rpc('create_course_access_coupon',[org,course,student])).rows[0].result;
  if (condition==='revoked') {
    const list = (await rpc('list_course_access_coupons',[org,course])).rows[0].result as any[];
    await rpc('revoke_course_access_coupon',[org,course,list[0].id]);
  }
  if (condition==='replaced') await rpc('create_course_access_coupon',[org,course,student]);
  if (condition==='changed-terms') {
    await act({type:'course-access',id:course,visibility:'private',pricing:'free'});
    await act({type:'course-access',id:course,visibility:'public',pricing:'paid',coursePrice:5000,discountedPrice:null});
  }
  if (condition==='expired' || condition==='inactive') {
    await db.exec('reset role');
    if(condition==='expired') await db.query(`update private.course_access_coupons set "expiresAt"=now()-interval '1 day'`);
    else await db.query('update public.memberships set active=false where "orgId"=$1 and "userId"=$2',[org,student]);
  }
  await as(student); await denied(() => rpc('redeem_course_access_coupon',[org,course,token]));
});
test('coupon issuance and student directory reject outsiders and invalid recipients', async () => {
  await courseTerms(); await as(teacher);
  const list = (await rpc('course_access_students',[org,course])).rows[0].result as any[];
  expect(list).toEqual([{id:student,name:'Student',email:'student@example.com'}]);
  await denied(() => rpc('create_course_access_coupon',[org,course,otherStudent]));
  await denied(() => rpc('create_course_access_coupon',[org,course,teacher]));
  await as(otherAdmin);
  await denied(() => rpc('course_access_students',[org,course]));
  await denied(() => rpc('create_course_access_coupon',[org,course,student]));
  await as(student);
  await denied(() => rpc('course_access_students',[org,course]));
  await denied(() => rpc('create_course_access_coupon',[org,course,student]));
});


test('course pricing persists numeric amounts and clears optional discounts', async () => {
  await courseTerms();
  await act({type:'course-access',id:course,visibility:'public',pricing:'paid',coursePrice:5000,discountedPrice:3999.5});
  const prices = async () => (await db.query('select "coursePrice","discountedPrice" from public.courses where id=$1',[course])).rows[0];
  expect(await prices()).toEqual({coursePrice:'5000',discountedPrice:'3999.5'});
  await act({type:'course-access',id:course,visibility:'public',pricing:'paid',coursePrice:5000,discountedPrice:null});
  expect(await prices()).toEqual({coursePrice:'5000',discountedPrice:null});
});

test.each([
  {}, {coursePrice:null}, {coursePrice:0}, {coursePrice:-1},
  {coursePrice:5000,discountedPrice:0}, {coursePrice:5000,discountedPrice:-1},
  {coursePrice:5000,discountedPrice:5000}, {coursePrice:5000,discountedPrice:6000},
])('paid course creation and editing reject invalid pricing %j', async (prices) => {
  await as(teacher);
  await denied(() => act({type:'course-access',id:course,visibility:'public',pricing:'paid',...prices}), /Price/);
  await denied(() => act({type:'course',course:{id:id(95),orgId:org,title:'Invalid pricing',subject:'Math',grade:'9',batch:'A',description:'Test',color:'sage',visibility:'public',pricing:'paid',...prices}}), /Price/);
  expect((await db.query('select id from public.courses where id=$1',[id(95)])).rows).toEqual([]);
});


test('course thumbnails persist, survive omitted updates, and can be removed', async () => {
  await as(teacher);
  const image = 'data:image/png;base64,AAAA';
  const data = {id:id(95),orgId:org,title:'Cover image',subject:'Math',grade:'9',batch:'A',description:'Test',color:'sage',visibility:'public',pricing:'paid',coursePrice:5000,thumbnailUrl:image};
  await act({type:'course',course:data});
  const saved = async () => (await db.query('select "thumbnailUrl" from public.courses where id=$1',[id(95)])).rows[0].thumbnailUrl;
  expect(await saved()).toBe(image);
  await act({type:'course-access',id:id(95),visibility:'public',pricing:'paid',coursePrice:4000});
  expect(await saved()).toBe(image);
  await as(student);
  await denied(() => act({type:'course-access',id:id(95),visibility:'public',pricing:'paid',coursePrice:4000,thumbnailUrl:null}));
  await as(teacher);
  expect(await saved()).toBe(image);
  await act({type:'course-access',id:id(95),visibility:'public',pricing:'paid',coursePrice:4000,thumbnailUrl:null});
  expect(await saved()).toBeNull();
});

test.each(['https://example.com/image.png','data:image/svg+xml;base64,AAAA','data:image/png;base64,' + 'A'.repeat(270000)])('course thumbnails reject unsupported or oversized content %#', async (thumbnailUrl) => {
  await as(teacher);
  await denied(() => act({type:'course-access',id:course,visibility:'private',pricing:'free',thumbnailUrl}), /course_thumbnail_valid/);
});
