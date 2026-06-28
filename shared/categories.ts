// Standard internal job_category taxonomy. Both 사람인 and 잡코리아 postings get
// normalized into these via api/lib/categoryMap.ts once their codes are known.
export interface CategoryDef {
  name: string;
  keywords: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    name: "프론트엔드 개발자",
    keywords: ["React", "TypeScript", "JavaScript", "Vite", "CSS", "Next.js", "협업", "Git", "반응형 웹", "성능 최적화"]
  },
  {
    name: "백엔드 개발자",
    keywords: ["Java", "Spring", "Node.js", "MySQL", "AWS", "RESTful API", "MSA", "Docker", "Kubernetes", "성능 최적화"]
  },
  {
    name: "데이터 분석가",
    keywords: ["SQL", "Python", "Tableau", "통계", "A/B테스트", "BigQuery", "데이터 시각화", "Excel", "보고서 작성", "협업"]
  },
  {
    name: "데이터 엔지니어",
    keywords: ["Python", "Spark", "Airflow", "SQL", "AWS", "Kafka", "데이터 파이프라인", "Docker", "MSA", "데이터 시각화"]
  },
  {
    name: "AI/ML 엔지니어",
    keywords: ["Python", "PyTorch", "TensorFlow", "통계", "MLOps", "AWS", "데이터 파이프라인", "Docker", "논문 리뷰", "성능 최적화"]
  },
  {
    name: "제품 매니저(PM)",
    keywords: ["기획", "협업", "데이터 시각화", "Figma", "로드맵 관리", "A/B테스트", "보고서 작성", "스타트업 경험", "Jira", "고객 인터뷰"]
  },
  {
    name: "UX/UI 디자이너",
    keywords: ["Figma", "프로토타이핑", "사용자 리서치", "디자인 시스템", "협업", "고객 인터뷰", "반응형 웹", "Adobe XD", "와이어프레임", "Jira"]
  },
  {
    name: "마케팅 매니저",
    keywords: ["퍼포먼스 마케팅", "GA4", "콘텐츠 기획", "SQL", "보고서 작성", "데이터 시각화", "SNS 운영", "광고 집행", "고객 인터뷰", "Excel"]
  },
  {
    name: "QA 엔지니어",
    keywords: ["테스트케이스 작성", "Selenium", "자동화 테스트", "Jira", "협업", "성능 최적화", "Docker", "버그 트래킹", "API 테스트", "Git"]
  },
  {
    name: "DevOps 엔지니어",
    keywords: ["AWS", "Kubernetes", "Docker", "CI/CD", "Terraform", "모니터링", "MSA", "Git", "성능 최적화", "보안"]
  }
];

export const REGIONS = ["서울", "경기", "인천", "부산", "대구", "원격근무"];

// Full keyword dictionary used by api/lib/keywordExtractor.ts to pull
// structured keywords out of free-text 자격요건 (e.g. 잡코리아's gi_duty).
export const KEYWORD_DICTIONARY = Array.from(new Set(CATEGORIES.flatMap((c) => c.keywords)));

export const EXPERIENCE_BUCKETS = ["신입", "경력 1-3년", "경력 4-7년", "경력무관"] as const;
export type ExperienceBucket = typeof EXPERIENCE_BUCKETS[number];

export function bucketExperience(min: number | null, max: number | null): ExperienceBucket {
  if (min === null && max === null) return "경력무관";
  if ((min ?? 0) === 0 && (max ?? 0) === 0) return "신입";
  const years = max ?? min ?? 0;
  if (years <= 3) return "경력 1-3년";
  return "경력 4-7년";
}

export const EDUCATION_LEVELS = ["고졸", "학사", "석사", "무관"] as const;
export type EducationLevel = typeof EDUCATION_LEVELS[number];
