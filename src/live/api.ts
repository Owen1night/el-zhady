import { rpc } from '../backend/api';
import type { Acknowledgement, LiveState, QuizChoice, Review } from './types';
export const liveApi = {
  choices: () => rpc<QuizChoice[]>('available_live_quizzes'),
  configure: (roomId: string, version: string) => rpc('configure_live_quiz', { p_room_id: roomId, p_version: version }),
  start: (roomId: string) => rpc('start_live_quiz', { p_room_id: roomId }),
  state: (roomId: string) => rpc<LiveState>('live_quiz_state', { p_room_id: roomId }),
  submit: (session: string, question: string, option: string) => rpc<Acknowledgement>('submit_live_quiz_answer', { p_session_id: session, p_question_id: question, p_option_id: option }),
  cancel: (roomId: string) => rpc('cancel_live_quiz', { p_room_id: roomId }),
  review: (roomId: string) => rpc<Review[]>('admin_live_quiz_review', { p_room_id: roomId }),
};
