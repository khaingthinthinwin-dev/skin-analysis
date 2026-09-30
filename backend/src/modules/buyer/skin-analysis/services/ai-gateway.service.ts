import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  ConditionName,
  ConditionSeverity,
  FindingType,
  SkinType,
} from '../types/skin-analysis.enums';

export interface AiConditionResult {
  conditionName: ConditionName;
  severity: ConditionSeverity;
  severityScore: number; // 0 - 100
  affectedArea: string;
  description: string;
  confidence: number; // 0.0 - 1.0
}

export interface AiFindingResult {
  findingType: FindingType;
  title: string;
  description: string;
  affectedArea: string;
  severity: ConditionSeverity;
}

export interface AiAnalysisPayload {
  skinType: SkinType;
  estimatedAge: number;
  healthScore: number; // 0 - 100
  hydration: number; // 0 - 100
  confidence: number; // 0 - 100
  conditions: AiConditionResult[];
  findings: AiFindingResult[];
  overallAssessment: string;
  meshSvg: string;
}

const CONDITION_ORDER: ConditionName[] = [
  ConditionName.ACNE,
  ConditionName.REDNESS,
  ConditionName.TEXTURE,
  ConditionName.PIGMENTATION,
  ConditionName.DRYNESS,
  ConditionName.PORE_SIZE,
];

const SEVERITY_ORDER: ConditionSeverity[] = [
  ConditionSeverity.NONE,
  ConditionSeverity.MILD,
  ConditionSeverity.MODERATE,
  ConditionSeverity.SEVERE,
];

const AFFECTED_AREAS: Record<ConditionName, string[]> = {
  [ConditionName.ACNE]: ['Cheeks', 'T-Zone', 'Jawline', 'Chin'],
  [ConditionName.REDNESS]: ['Cheeks', 'Nose', 'Central Face'],
  [ConditionName.TEXTURE]: ['Forehead', 'Cheeks', 'Whole Face'],
  [ConditionName.PIGMENTATION]: ['Cheekbone Area', 'Forehead', 'Temples'],
  [ConditionName.DRYNESS]: ['Jawline & Cheeks', 'Whole Face', 'Cheekbones'],
  [ConditionName.PORE_SIZE]: ['T-Zone', 'Nose & Inner Cheeks', 'Nasal Crest'],
};

const DESCRIPTIONS: Record<ConditionSeverity, Record<ConditionName, string>> = {
  [ConditionSeverity.NONE]: {
    [ConditionName.ACNE]: 'Minimal bacterial or inflammatory lesions detected.',
    [ConditionName.REDNESS]:
      'Even skin tone with no visible vascular dilation.',
    [ConditionName.TEXTURE]: 'Smooth surface with uniform micro-texture.',
    [ConditionName.PIGMENTATION]:
      'Even melanin distribution with negligible photo-damage.',
    [ConditionName.DRYNESS]: 'Well-hydrated surface with intact lipid barrier.',
    [ConditionName.PORE_SIZE]:
      'Pores are compact with minimal follicular dilation.',
  },
  [ConditionSeverity.MILD]: {
    [ConditionName.ACNE]:
      'A sparse collection of small lesions confined to the lower face.',
    [ConditionName.REDNESS]:
      'Slight vascular dilation observed around central cheek area.',
    [ConditionName.TEXTURE]:
      'Minor epidermal roughness present on light-reflective zones.',
    [ConditionName.PIGMENTATION]:
      'Faint localized pigmentation with light sun exposure marks.',
    [ConditionName.DRYNESS]:
      'Noticeable but minor moisture depletion in exposed regions.',
    [ConditionName.PORE_SIZE]:
      'Slight follicular dilation in the nasal bridge and inner cheek junction.',
  },
  [ConditionSeverity.MODERATE]: {
    [ConditionName.ACNE]:
      'Multiple active lesions with mild inflammation in the U-zone.',
    [ConditionName.REDNESS]:
      'Persistent vascular congestion across the central face.',
    [ConditionName.TEXTURE]:
      'Irregular texture with visible surface roughness and fine creping.',
    [ConditionName.PIGMENTATION]:
      'Clustered hyperpigmentation with darkened patches on exposed skin.',
    [ConditionName.DRYNESS]:
      'Noticeable moisture depletion detected along the lateral jawline.',
    [ConditionName.PORE_SIZE]:
      'Enlarged pores with visible sebum accumulation across the T-Zone.',
  },
  [ConditionSeverity.SEVERE]: {
    [ConditionName.ACNE]:
      'Widespread inflammatory lesions with nodular structure across multiple zones.',
    [ConditionName.REDNESS]:
      'Diffuse erythema with notable vascular prominence and flushing episodes.',
    [ConditionName.TEXTURE]:
      'Pronounced roughness with deep creping and enlarged skin structure.',
    [ConditionName.PIGMENTATION]:
      'Dense hyperpigmentation covering large continuous surface areas.',
    [ConditionName.DRYNESS]:
      'Severe dehydration with flaking and compromised barrier function.',
    [ConditionName.PORE_SIZE]:
      'Severe follicular dilation with obstructed and highly visible pores.',
  },
};

const OVERALL_TEMPLATES = [
  'Skin demonstrates healthy tone with minor maintenance needs focused on the {top} region.',
  'Overall skin health is good; primary attention should remain on {top} management and daily hydration.',
  'Balanced skin profile with improvement opportunities centred on {top} and barrier hydration.',
  'Skin shows solid elasticity; near-term care should prioritise {top} support and UV defence.',
];

const MESH_SVG_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
  <rect width="640" height="640" fill="none"/>
  <g fill="none" stroke="#00e5ff" stroke-opacity="0.85" stroke-width="1.4">
    <ellipse cx="320" cy="340" rx="185" ry="240"/>
    <ellipse cx="320" cy="330" rx="120" ry="155"/>
    <ellipse cx="320" cy="120" rx="56" ry="46"/>
    <ellipse cx="320" cy="470" rx="86" ry="66"/>
  </g>
  <g stroke="#00e5ff" stroke-opacity="0.55" stroke-width="0.8">
    <path d="M135 340 H505"/> <path d="M148 280 H492"/> <path d="M172 400 H468"/>
    <path d="M240 620 V70"/> <path d="M400 620 V70"/> <path d="M320 620 V70"/>
    <path d="M148 220 H492"/> <path d="M320 100 C220 220 220 460 320 590"/>
    <path d="M320 100 C420 220 420 460 320 590"/>
  </g>
  <g fill="#00e5ff">
    <circle cx="320" cy="120" r="4" fill-opacity="0.9"/>
    <circle cx="268" cy="260" r="3" fill-opacity="0.9"/>
    <circle cx="372" cy="260" r="3" fill-opacity="0.9"/>
    <circle cx="268" cy="300" r="3" fill-opacity="0.9"/>
    <circle cx="372" cy="300" r="3" fill-opacity="0.9"/>
    <circle cx="320" cy="292" r="3" fill-opacity="0.9"/>
    <circle cx="210" cy="320" r="3" fill-opacity="0.9"/>
    <circle cx="430" cy="320" r="3" fill-opacity="0.9"/>
  </g>
</svg>`;

/**
 * Local deterministic AI diagnostic simulator.
 *
 * Produces a stable, plausible `AiAnalysisPayload` seeded from the scan image
 * hashed with the buyer id, so repeated runs for the same input yield the same
 * result. No external AI service is invoked. The class deliberately mirrors
 * the `AiGatewayService` contract so a real integration can replace it.
 */
@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  async analyze(
    imageBuffer: Buffer,
    userId: string,
  ): Promise<AiAnalysisPayload> {
    return Promise.resolve(this.compute(imageBuffer, userId));
  }

  private compute(imageBuffer: Buffer, userId: string): AiAnalysisPayload {
    const seed = this.seedFrom(imageBuffer, userId);
    const rand = this.mulberry32(seed);

    const skinType =
      SkinType[
        ['COMBINATION', 'OILY', 'DRY', 'NORMAL', 'SENSITIVE'][
          Math.floor(rand() * 5)
        ] as keyof typeof SkinType
      ];

    const conditions: AiConditionResult[] = CONDITION_ORDER.map((name, index) =>
      this.buildCondition(name, index, rand),
    );

    const healthScore = this.clamp(58 + Math.round(rand() * 36), 1, 100);
    const hydration = this.clamp(48 + Math.round(rand() * 36), 5, 100);
    const confidence = this.clamp(84 + Math.round(rand() * 14), 50, 100);
    const estimatedAge = 18 + Math.floor(rand() * 27);

    const findings = this.buildFindings(conditions);
    const topCondition = conditions
      .slice()
      .sort((a, b) => b.severityScore - a.severityScore)[0];

    const topLabel = this.describeCondition(topCondition);
    const overallAssessment = OVERALL_TEMPLATES[
      Math.floor(rand() * OVERALL_TEMPLATES.length)
    ].replace('{top}', topLabel);

    return {
      skinType,
      estimatedAge,
      healthScore,
      hydration,
      confidence,
      conditions,
      findings,
      overallAssessment,
      meshSvg: MESH_SVG_TEMPLATE,
    };
  }

  private buildCondition(
    name: ConditionName,
    index: number,
    rand: () => number,
  ): AiConditionResult {
    const roll = rand();
    const severity =
      roll < 0.34
        ? ConditionSeverity.NONE
        : roll < 0.68
          ? ConditionSeverity.MILD
          : roll < 0.9
            ? ConditionSeverity.MODERATE
            : ConditionSeverity.SEVERE;

    const areas = AFFECTED_AREAS[name];
    const affectedArea =
      severity === ConditionSeverity.NONE
        ? 'None'
        : areas[index % areas.length];
    const severityScore = this.severityScore(severity, rand);
    const confidence = this.round2(0.7 + rand() * 0.28);

    return {
      conditionName: name,
      severity,
      severityScore,
      affectedArea,
      description: DESCRIPTIONS[severity][name],
      confidence,
    };
  }

  private severityScore(
    severity: ConditionSeverity,
    rand: () => number,
  ): number {
    switch (severity) {
      case ConditionSeverity.NONE:
        return this.clamp(Math.round(rand() * 10), 0, 10);
      case ConditionSeverity.MILD:
        return this.clamp(11 + Math.round(rand() * 24), 11, 35);
      case ConditionSeverity.MODERATE:
        return this.clamp(36 + Math.round(rand() * 24), 36, 60);
      case ConditionSeverity.SEVERE:
        return this.clamp(61 + Math.round(rand() * 39), 61, 100);
    }
  }

  private buildFindings(conditions: AiConditionResult[]): AiFindingResult[] {
    const ranked = conditions
      .filter((c) => c.severity !== ConditionSeverity.NONE)
      .sort((a, b) => b.severityScore - a.severityScore);

    const findings: AiFindingResult[] = [];
    if (ranked.length > 0) {
      const primary = ranked[0];
      findings.push({
        findingType: FindingType.PRIMARY,
        title: this.primaryTitle(primary),
        description: primary.description,
        affectedArea: primary.affectedArea,
        severity: primary.severity,
      });
    }
    if (ranked.length > 1) {
      const secondary = ranked[1];
      findings.push({
        findingType: FindingType.SECONDARY,
        title: this.secondaryTitle(secondary),
        description:
          secondary.severity === ConditionSeverity.MILD
            ? `${secondary.description} Minor, so daily maintenance is sufficient.`
            : secondary.description,
        affectedArea: secondary.affectedArea,
        severity: secondary.severity,
      });
    }
    return findings;
  }

  private primaryTitle(condition: AiConditionResult): string {
    const label = this.describeCondition(condition);
    return `${this.capitalize(label)} Attention Required`;
  }

  private secondaryTitle(condition: AiConditionResult): string {
    const label = this.describeCondition(condition);
    return `${this.capitalize(label)} Maintenance`;
  }

  private describeCondition(condition: AiConditionResult): string {
    switch (condition.conditionName) {
      case ConditionName.ACNE:
        return 'acne management';
      case ConditionName.REDNESS:
        return 'hydration support';
      case ConditionName.TEXTURE:
        return 'exfoliation';
      case ConditionName.PIGMENTATION:
        return 'brightening';
      case ConditionName.DRYNESS:
        return 'barrier hydration';
      case ConditionName.PORE_SIZE:
        return 'pore minimizing';
    }
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private seedFrom(imageBuffer: Buffer, userId: string): number {
    const hash = createHash('sha256')
      .update(imageBuffer)
      .update(userId)
      .digest('hex');
    return parseInt(hash.slice(0, 8), 16);
  }

  private mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  // Exposed for unit tests that validate severity ordering.
  static severityRank(severity: ConditionSeverity): number {
    return SEVERITY_ORDER.indexOf(severity);
  }
}
