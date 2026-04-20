/**
 * Wire-level shape of one team's capability row, mirroring the backend
 * {@code TeamCapabilityResponse} record 1:1. Combines TBA OPR, Statbotics EPA, and RavenBrain
 * scouting aggregates into a single structure with server-computed staleness flags, coverage
 * classification, and withdrawn detection.
 *
 * <p>Nullable numerics are modelled as {@code number | null} (not {@code number | undefined}) to
 * match the Jackson serialization emitted by Micronaut Serde for {@code @Nullable Double} fields.
 *
 * <ul>
 *   <li>{@code oprStale} — true when the backing OPR row is missing or last fetch failed.
 *   <li>{@code epaStale} — true when the backing Statbotics row is missing or last fetch failed.
 *   <li>{@code scoutingCoverage} — {@code "full"}, {@code "thin"}, or {@code "none"}.
 *   <li>{@code withdrawn} — team appears in roster but absent from the latest Statbotics sync.
 * </ul>
 */
export interface TeamCapability {
  teamNumber: number;
  teamName: string | null;
  opr: number | null;
  oprStale: boolean;
  epaTotal: number | null;
  epaAuto: number | null;
  epaTeleop: number | null;
  epaEndgame: number | null;
  epaUnitless: number | null;
  epaNorm: number | null;
  epaStale: boolean;
  autoAccuracy: number | null;
  teleopSuccessRate: number | null;
  pickupAverage: number | null;
  quickCommentCount: number;
  robotAlertCount: number;
  robotAlertMaxSeverity: string | null;
  scoutingCoverage: "full" | "thin" | "none";
  withdrawn: boolean;
}
