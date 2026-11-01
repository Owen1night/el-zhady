import { supabase } from './client';
import { bounded, ServiceError, serviceError } from './errors';
import type { CompetitionHistory, Lobby, PracticeResult, Profile, Room } from './contracts';
function client() { if (!supabase) throw new ServiceError('UNCONFIGURED'); return supabase; }
async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const { data, error } = await bounded(client().rpc(name, args));
    if (error) throw error;
    if (data && typeof data === 'object' && 'error' in data) throw new ServiceError(String(data.error));
    return data as T;
  } catch (error) { throw serviceError(error); }
}
export const api = {
  access: () => rpc<{ registered: boolean; admin: boolean }>('my_access'),
  async profile(userId: string): Promise<Profile | null> {
    const { data, error } = await bounded(client().from('profiles').select('user_id,display_name,created_at,updated_at').eq('user_id', userId).maybeSingle());
    if (error) throw serviceError(error);
    return data;
  },
  saveProfile: (name: string) => rpc<Profile>('save_profile', { p_display_name: name }),
  joinRoom: (code: string, name: string) => rpc<{ room_id: string; participant_id: string }>('join_room', { p_code: code, p_display_name: name }),
  lobby: (id: string) => rpc<Lobby>('get_lobby', { p_room_id: id }),
  heartbeat: (id: string) => rpc<null>('lobby_heartbeat', { p_room_id: id }),
  createRoom: (requestId: string, title: string) => rpc<Room>('admin_create_room', { p_request_id: requestId, p_title: title }),
  roomAction: (id: string, action: 'lock' | 'unlock' | 'close' | 'remove', participantId?: string) => rpc<null>('admin_room_action', { p_room_id: id, p_action: action, p_participant_id: participantId || null }),
  async adminRooms(): Promise<Room[]> {
    const { data, error } = await bounded(client().from('rooms').select('*').order('created_at', { ascending: false }).limit(100));
    if (error) throw serviceError(error);
    return data || [];
  },
  async practice(): Promise<PracticeResult[]> {
    const { data, error } = await bounded(client().from('practice_results').select('activity_id,score,max_score,content_version,completed_at'));
    if (error) throw serviceError(error);
    return data || [];
  },
  history: () => rpc<CompetitionHistory[]>('my_competition_history'),
};
