import type { ActivityType } from '../data/types';
export type Profile = { user_id: string; display_name: string; created_at: string; updated_at: string };
export type Room = { id: string; code: string; title: string; status: 'waiting' | 'closed'; locked: boolean; capacity: number; created_at: string; updated_at: string };
export type Participant = { id: string; room_id: string; display_name: string; display_suffix: number; status: 'active' | 'removed'; joined_at: string; last_seen_at: string };
export type CompetitionResult = { participant_id: string; room_id: string; display_name_snapshot: string; display_suffix: number; score: number; max_score: number; recorded_at: string };
export type CompetitionHistory = { session_id?: string; scoring_kind?: 'legacy_100' | 'live_quiz_raw'; correct_count?: number; speed_points?: number; rank?: number | null; eligible?: boolean; participant_id: string; room_title: string; room_code: string; display_name: string; display_suffix: number; score: number; max_score: number; recorded_at: string };
export type PracticeResult = { activity_id: ActivityType; score: number; max_score: 20; content_version: string; completed_at: string };
export type Lobby = { room: Room; participants: Participant[]; results: CompetitionResult[]; my_participant_id: string | null; can_manage: boolean };
export type Identity = { id: string; anonymous: boolean };
