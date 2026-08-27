import type { AssignmentSubmission, ClassAssignment } from '../types';

const DAY = 86400000;
const HOUR = 3600000;
const now = Date.now();

export const seedAssignments: ClassAssignment[] = [
  {
    id: 'asg-1',
    classId: 'cls-1',
    teacherId: '1',
    title: 'Landing page wireframe',
    description:
      'Design a wireframe for a landing page of your choice using any tool you like (Figma, paper sketch photo). Focus on hierarchy, spacing, and call-to-action placement. Submit a short paragraph explaining your choices.',
    type: 'homework',
    dueISO: new Date(now + 3 * DAY).toISOString(),
    createdAt: new Date(now - 2 * DAY).toISOString(),
  },
  {
    id: 'asg-2',
    classId: 'cls-1',
    teacherId: '1',
    title: 'Color theory mini-project',
    description:
      'Pick one color palette (complementary, analogous, or triadic) and apply it to a simple app screen mockup. Explain why the palette fits the use case.',
    type: 'assignment',
    dueISO: new Date(now - 1 * DAY).toISOString(),
    createdAt: new Date(now - 5 * DAY).toISOString(),
  },
  {
    id: 'asg-3',
    classId: 'cls-4',
    teacherId: '4',
    title: 'Public speaking outline',
    description:
      "Prepare a 3-minute talk outline on a topic you're passionate about: opening hook, three key points with examples, and a closing line. Bring it to the next session.",
    type: 'homework',
    dueISO: new Date(now + 5 * DAY).toISOString(),
    createdAt: new Date(now - 1 * DAY).toISOString(),
  },
];

export const seedSubmissions: AssignmentSubmission[] = [
  {
    id: 'sub-1',
    assignmentId: 'asg-2',
    studentId: '2',
    text: 'I used an analogous blue-green palette for a meditation timer app. Calm colors help signal rest, and I kept the CTA in amber for contrast.',
    submittedAt: new Date(now - 2 * DAY).toISOString(),
    status: 'graded',
    grade: 92,
    feedback: 'Excellent reasoning on contrast accessibility. Next time show a light AND dark variant.',
    gradedAt: new Date(now - 30 * HOUR).toISOString(),
  },
];
