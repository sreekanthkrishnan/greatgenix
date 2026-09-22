import { describe, expect, it } from 'vitest';
import { applyDemoAction } from './demo';
import { canSeeCourse, makeSeed, visibleLessons, type Viewer } from './model';

const teacher: Viewer = { role: 'teacher', orgId: 'genix', userId: 'maya' };
const admin: Viewer = { ...teacher, role: 'teacher-admin' };
const student: Viewer = { role: 'student', orgId: 'genix', userId: 'arjun' };
const platform: Viewer = { role: 'super-admin', orgId: 'genix', userId: 'platform' };

describe('demo scope and workflow boundaries (not production authorization)', () => {
  it('isolates course visibility by organization even for a teacher-admin', () => {
    const state = makeSeed();
    expect(state.courses.filter(c => canSeeCourse(c, admin)).map(c => c.id)).toEqual(['math', 'science', 'english']);
    expect(state.courses.filter(c => canSeeCourse(c, platform))).toEqual([]);
  });
  it('does not grant ordinary teachers administration or platform controls', () => {
    expect(() => applyDemoAction(makeSeed(), teacher, {type:'rename',name:'Changed'})).toThrow();
    expect(() => applyDemoAction(makeSeed(), admin, {type:'feature',orgId:'genix',feature:'live'})).toThrow();
    expect(applyDemoAction(makeSeed(), admin, {type:'rename',name:'Demo organization'}).orgs[0].name).toBe('Demo organization');
  });
  it('requires review and approval before students see a draft lesson', () => {
    const state=makeSeed();
    expect(visibleLessons(state,student).some(l=>l.id==='l5')).toBe(false);
    expect(()=>applyDemoAction(state,teacher,{type:'lesson-status',id:'l5',status:'published',reviewed:false})).toThrow();
    const approved=applyDemoAction(state,teacher,{type:'lesson-status',id:'l5',status:'published',reviewed:true});
    expect(visibleLessons(approved,student).some(l=>l.id==='l5')).toBe(true);
    const withdrawn=applyDemoAction(approved,teacher,{type:'lesson-status',id:'l5',status:'draft',reviewed:false});
    expect(visibleLessons(withdrawn,student).some(l=>l.id==='l5')).toBe(false);
    expect(()=>applyDemoAction(withdrawn,teacher,{type:'lesson-status',id:'l5',status:'published',reviewed:true})).toThrow();
  });
  it('does not let a student publish or complete unpublished content', () => {
    expect(()=>applyDemoAction(makeSeed(),student,{type:'lesson-status',id:'l5',status:'published',reviewed:true})).toThrow();
    expect(()=>applyDemoAction(makeSeed(),student,{type:'complete',id:'l5'})).toThrow();
  });
  it('denies cross-organization record actions', () => {
    expect(()=>applyDemoAction(makeSeed(),teacher,{type:'lesson-status',id:'cl1',status:'draft',reviewed:false})).toThrow();
    expect(()=>applyDemoAction(makeSeed(),student,{type:'complete',id:'cl1'})).toThrow();
    expect(()=>applyDemoAction(makeSeed(),teacher,{type:'attendance',sessionId:'cs1',values:{'cedar-student':'present'}})).toThrow();
  });
  it('separates feature entitlements from roles and preserves disabled content', () => {
    const state=applyDemoAction(makeSeed(),platform,{type:'feature',orgId:'genix',feature:'recordings'});
    expect(visibleLessons(state,admin)).toEqual([]);
    expect(()=>applyDemoAction(state,teacher,{type:'lesson-status',id:'l5',status:'published',reviewed:true})).toThrow();
    expect(state.lessons).toHaveLength(6);
    expect(state.orgs.find(o=>o.id==='cedar')!.features.recordings).toBe(true);
  });
  it('blocks organization actions while suspended and preserves records on restoration', () => {
    const suspended=applyDemoAction(makeSeed(),platform,{type:'org-status',orgId:'genix'});
    expect(()=>applyDemoAction(suspended,admin,{type:'rename',name:'No'})).toThrow();
    const restored=applyDemoAction(suspended,platform,{type:'org-status',orgId:'genix'});
    expect(restored.orgs[0].active).toBe(true);
    expect(restored.courses).toHaveLength(4);
  });
  it('supports submission, bounded grading, publication and resubmission', () => {
    const submitted=applyDemoAction(makeSeed(),student,{type:'submit',id:'a1',answer:'The pen is 20; the notebook is 50.'});
    const sub=submitted.submissions.find(s=>s.assignmentId==='a1'&&s.studentId==='arjun')!;
    expect(()=>applyDemoAction(submitted,teacher,{type:'grade',id:sub.id,score:11,feedback:'Good'})).toThrow();
    expect(()=>applyDemoAction(submitted,student,{type:'grade',id:sub.id,score:10,feedback:'Good'})).toThrow();
    const graded=applyDemoAction(submitted,teacher,{type:'grade',id:sub.id,score:10,feedback:'Clear reasoning.'});
    expect(graded.submissions.find(s=>s.id===sub.id)?.published).toBe(true);
    const revised=applyDemoAction(graded,student,{type:'submit',id:'a1',answer:'A revised explanation.'});
    expect(revised.submissions.find(s=>s.id===sub.id)?.score).toBeUndefined();
    expect(revised.submissions.find(s=>s.id===sub.id)?.published).toBe(false);
  });
  it('rejects foreign students in attendance and allows local attendance', () => {
    expect(()=>applyDemoAction(makeSeed(),teacher,{type:'attendance',sessionId:'s1',values:{'cedar-student':'present'}})).toThrow();
    const updated=applyDemoAction(makeSeed(),teacher,{type:'attendance',sessionId:'s1',values:{arjun:'present',isha:'late'}});
    expect(updated.attendance.s1).toEqual({arjun:'present',isha:'late'});
  });
  it('makes demo completion reversible', () => {
    const completed=applyDemoAction(makeSeed(),student,{type:'complete',id:'l1'});
    expect(completed.lessons.find(l=>l.id==='l1')?.completeBy).toContain('arjun');
    expect(applyDemoAction(completed,student,{type:'complete',id:'l1'}).lessons.find(l=>l.id==='l1')?.completeBy).not.toContain('arjun');
  });
});
