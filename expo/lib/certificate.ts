import type { SkillSwapRequest, GroupClass, User, Skill } from '@/types';

// ============================================================
//  leteski Certificate System
// ============================================================

export type CertificateType = 'swap_completion' | 'class_teaching' | 'class_completion';

export interface CertificateData {
  id: string;
  type: CertificateType;
  recipientName: string;
  skillTitle: string;
  skillCategory: string;
  skillLevel: string;
  partnerName: string;
  completedAt: string;
  certificateNumber: string;
  /** "teacher" if user taught, "learner" if user learned */
  role: 'teacher' | 'learner';
  sessionId: string;
}

const CERT_PREFIX = 'LTRN-';

export function generateCertificateNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${CERT_PREFIX}${ts}-${rand}`;
}

export function buildSwapCertificates(
  swaps: SkillSwapRequest[],
  currentUser: User,
  allUsers: User[],
  skills: Skill[],
): CertificateData[] {
  return swaps
    .filter(s => s.status === 'completed')
    .map(swap => {
      const isRequester = swap.requesterId === currentUser.id;
      const partnerId = isRequester ? swap.recipientId : swap.requesterId;
      const partner = allUsers.find(u => u.id === partnerId);
      const recipientSkillId = isRequester ? swap.recipientSkillId : swap.requesterSkillId;
      const taughtSkill = skills.find(sk => sk.id === recipientSkillId);

      return {
        id: `cert-swap-${swap.id}`,
        type: 'swap_completion' as CertificateType,
        recipientName: currentUser.name,
        skillTitle: taughtSkill?.title ?? 'Skill Session',
        skillCategory: taughtSkill?.category ?? 'General',
        skillLevel: taughtSkill?.level ?? 'Intermediate',
        partnerName: partner?.name ?? 'leteski Member',
        completedAt: swap.updatedAt,
        certificateNumber: generateCertificateNumber(),
        role: (isRequester ? 'learner' : 'teacher') as 'teacher' | 'learner',
        sessionId: swap.id,
      };
    });
}

export function buildClassCertificates(
  classes: GroupClass[],
  enrollments: { classId: string; studentId: string; status: string }[],
  currentUser: User,
  allUsers: User[],
): CertificateData[] {
  const certs: CertificateData[] = [];

  for (const cls of classes) {
    if (cls.status !== 'completed') continue;

    // Teacher certificate
    if (cls.teacherId === currentUser.id) {
      const attendedCount = enrollments.filter(
        e => e.classId === cls.id && e.status === 'attended',
      ).length;
      certs.push({
        id: `cert-class-teach-${cls.id}`,
        type: 'class_teaching' as CertificateType,
        recipientName: currentUser.name,
        skillTitle: cls.title,
        skillCategory: cls.category,
        skillLevel: cls.level,
        partnerName: `${attendedCount} student${attendedCount === 1 ? '' : 's'}`,
        completedAt: cls.endISO,
        certificateNumber: generateCertificateNumber(),
        role: 'teacher' as const,
        sessionId: cls.id,
      });
    }

    // Student certificate (if attended)
    const myEnrollment = enrollments.find(
      e => e.classId === cls.id && e.studentId === currentUser.id && e.status === 'attended',
    );
    if (myEnrollment) {
      const teacher = allUsers.find(u => u.id === cls.teacherId);
      certs.push({
        id: `cert-class-learn-${cls.id}`,
        type: 'class_completion' as CertificateType,
        recipientName: currentUser.name,
        skillTitle: cls.title,
        skillCategory: cls.category,
        skillLevel: cls.level,
        partnerName: teacher?.name ?? 'leteski Instructor',
        completedAt: cls.endISO,
        certificateNumber: generateCertificateNumber(),
        role: 'learner' as const,
        sessionId: cls.id,
      });
    }
  }

  return certs;
}

const typeLabels: Record<CertificateType, { title: string; subtitle: string }> = {
  swap_completion: {
    title: 'Certificate of Skill Exchange',
    subtitle: 'Skill Swap Completion',
  },
  class_teaching: {
    title: 'Certificate of Teaching Excellence',
    subtitle: 'Group Class Instruction',
  },
  class_completion: {
    title: 'Certificate of Completion',
    subtitle: 'Group Class Attended',
  },
};

export function getCertificateLabel(type: CertificateType) {
  return typeLabels[type];
}

export function formatDate(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================
//  HTML Certificate — for download/share
// ============================================================

export function generateCertificateHTML(cert: CertificateData): string {
  const label = getCertificateLabel(cert.type);
  const dateStr = formatDate(cert.completedAt);
  const roleText = cert.role === 'teacher' ? 'successfully taught' : 'successfully completed';
  const partnerLabel = cert.role === 'teacher' ? 'Students' : 'Instructor';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>leteski Certificate — ${cert.recipientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', sans-serif;
    background: #0F172A;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 20px;
  }
  .certificate {
    width: 900px; max-width: 100%;
    background: linear-gradient(135deg, #FFFFFF 0%, #FFFBF5 50%, #FFF7ED 100%);
    border-radius: 24px;
    padding: 0;
    position: relative;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0,0,0,0.3);
  }
  .border-frame {
    position: absolute; top: 20px; left: 20px; right: 20px; bottom: 20px;
    border: 3px solid #6366F1;
    border-radius: 16px;
    pointer-events: none;
  }
  .corner {
    position: absolute; width: 50px; height: 50px;
    border: 4px solid #F59E0B;
  }
  .corner-tl { top: 20px; left: 20px; border-right: none; border-bottom: none; border-radius: 16px 0 0 0; }
  .corner-tr { top: 20px; right: 20px; border-left: none; border-bottom: none; border-radius: 0 16px 0 0; }
  .corner-bl { bottom: 20px; left: 20px; border-right: none; border-top: none; border-radius: 0 0 0 16px; }
  .corner-br { bottom: 20px; right: 20px; border-left: none; border-top: none; border-radius: 0 0 16px 0; }
  .content { padding: 70px 60px; text-align: center; position: relative; z-index: 1; }
  .logo-section { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px; }
  .logo-text { font-size: 28px; font-weight: 800; color: #6366F1; letter-spacing: -0.5px; }
  .logo-dot { width: 10px; height: 10px; border-radius: 50%; background: #F59E0B; }
  .subtitle-top { font-size: 13px; color: #64748B; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 40px; }
  .cert-title { font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 800; color: #0F172A; margin-bottom: 8px; line-height: 1.2; }
  .cert-subtitle { font-size: 15px; color: #6366F1; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 40px; }
  .presented-to { font-size: 14px; color: #64748B; font-weight: 500; margin-bottom: 12px; letter-spacing: 1px; text-transform: uppercase; }
  .recipient-name { font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 700; color: #0F172A; margin-bottom: 40px; border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; display: inline-block; min-width: 400px; }
  .body-text { font-size: 17px; color: #334155; line-height: 1.7; max-width: 600px; margin: 0 auto 12px; }
  .skill-name { font-weight: 700; color: #6366F1; }
  .partner-name { font-weight: 600; color: #0F172A; }
  .meta-row { display: flex; justify-content: center; gap: 40px; margin: 40px 0; }
  .meta-item { text-align: center; }
  .meta-label { font-size: 11px; color: #94A3B8; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
  .meta-value { font-size: 16px; color: #0F172A; font-weight: 700; }
  .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 40px; }
  .sig-block { text-align: center; width: 200px; }
  .sig-line { border-top: 2px solid #334155; margin-bottom: 8px; padding-top: 8px; }
  .sig-name { font-size: 14px; font-weight: 700; color: #0F172A; }
  .sig-title { font-size: 12px; color: #64748B; }
  .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0; }
  .cert-number { font-size: 12px; color: #94A3B8; font-weight: 600; letter-spacing: 1px; margin-bottom: 8px; }
  .company { font-size: 13px; color: #64748B; font-weight: 600; }
  .company-sub { font-size: 11px; color: #94A3B8; margin-top: 4px; }
  .seal {
    position: absolute; bottom: 100px; right: 60px;
    width: 80px; height: 80px; border-radius: 50%;
    background: linear-gradient(135deg, #6366F1, #4F46E5);
    display: flex; align-items: center; justify-content: center;
    color: #FFFFFF; font-size: 32px; font-weight: 800;
    box-shadow: 0 4px 15px rgba(99,102,241,0.3);
    border: 3px solid #FFFFFF;
  }
</style>
</head>
<body>
  <div class="certificate">
    <div class="border-frame"></div>
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>
    <div class="content">
      <div class="logo-section">
        <div class="logo-dot"></div>
        <div class="logo-text">leteski</div>
        <div class="logo-dot"></div>
      </div>
      <div class="subtitle-top">Skill Exchange Platform</div>
      <div class="cert-title">${label.title}</div>
      <div class="cert-subtitle">${label.subtitle}</div>
      <div class="presented-to">This certificate is proudly presented to</div>
      <div class="recipient-name">${cert.recipientName}</div>
      <p class="body-text">For having <strong>${roleText}</strong> the skill <span class="skill-name">${cert.skillTitle}</span> (${cert.skillLevel} level) in the category of ${cert.skillCategory}.</p>
      <p class="body-text">${partnerLabel}: <span class="partner-name">${cert.partnerName}</span></p>
      <div class="meta-row">
        <div class="meta-item">
          <div class="meta-label">Date of Completion</div>
          <div class="meta-value">${dateStr}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Skill Level</div>
          <div class="meta-value">${cert.skillLevel}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Category</div>
          <div class="meta-value">${cert.skillCategory}</div>
        </div>
      </div>
      <div class="signatures">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-name">leteski</div>
          <div class="sig-title">Platform</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-name">${cert.partnerName}</div>
          <div class="sig-title">${cert.role === 'teacher' ? 'Verified by Students' : 'Verified by Instructor'}</div>
        </div>
      </div>
      <div class="footer">
        <div class="cert-number">Certificate No: ${cert.certificateNumber}</div>
        <div class="company">Gizmoverse Private Limited</div>
        <div class="company-sub">leteski is a product of Gizmoverse Private Limited</div>
      </div>
    </div>
    <div class="seal">L</div>
  </div>
</body>
</html>`;
}
