import { rpc } from '../backend/api';
import type { Acknowledgement, LiveState, QuizChoice, Review } from './types';
export const liveApi = {
  choices: () => rpc<QuizChoice[]>('available_live_quizzes'),
  configure: (roomId: string, version: string) => rpc('configure_live_quiz', { p_room_id: roomId, p_version: version }),
  start: (roomId: string, round = 1) => rpc('start_competition_round', { p_room_id: roomId, p_round_number: round }),
  configureLineup: (roomId: string, version: string, count: number) => rpc('configure_competition', { p_room_id: roomId, p_lineup: Array.from({ length: count }, () => ({ game_kind: 'quiz', set_version: version })) }),
  reveal: (roomId: string) => rpc('reveal_competition_results', { p_room_id: roomId }),
  state: (roomId: string) => rpc<LiveState>('live_quiz_state', { p_room_id: roomId }),
  submit: (session: string, question: string, option: string) => rpc<Acknowledgement>('submit_live_quiz_answer', { p_session_id: session, p_question_id: question, p_option_id: option }),
  cancel: (roomId: string) => rpc('cancel_live_quiz', { p_room_id: roomId }),
  review: (roomId: string, round = 1) => rpc<Review[]>('admin_competition_round_review', { p_room_id: roomId, p_round_number: round }),
};
