/** Drafts may omit sources. Verified material must carry at least one reference. */
export type SourceReference = { sourceId: string; locator: string };
export type NonEmpty<T> = readonly [T, ...T[]];
export type EditorialState =
  | { status: 'sourced'; sourceRefs: NonEmpty<SourceReference>; checkedOn: string; editorialNote: string }
  | { status: 'draft'; sourceRefs: readonly SourceReference[]; editorialNote: string }
  | { status: 'verified'; sourceRefs: NonEmpty<SourceReference>; reviewedBy: string; reviewedOn: string };
export type Sourced<T> = T & EditorialState;
export type Period = 'context' | 'war' | 'postwar';
export type Category = 'front' | 'homefront' | 'postwar';
export type Thesis = Sourced<{ id: string; title: string; text: string; factIds: string[] }>;
export type HistoricalFact = Sourced<{ id: string; title: string; text: string; period: Period; figureIds: string[] }>;
export type HistoricalFigure = Sourced<{ id: string; name: string; role: 'hero' | 'postwar'; biography: string; imageId?: string }>;
export type TimelineEvent = Sourced<{ id: string; date: string; title: string; description: string; period: Period }>;
export type Source = {
  id: string; title: string; author: string; publisher: string; publicationDate: string;
  url?: string; accessedOn?: string; status: 'candidate' | 'checked'; notes: string;
};
export type HistoricalImage = Sourced<{
  id: string; src: string; alt: string; caption: string; creator: string;
  collection: string; catalogueId: string; license: string; credit: string;
}>;
export type MapLocation = Sourced<{
  id: string; name: string; latitude: number; longitude: number;
  description: string; eventIds: string[]; period: Period;
}>;
export type Video = Sourced<{
  id: string; title: string; url: string; provider: 'file' | 'youtube';
  creator: string; duration: string; captionUrl?: string; transcript: string; checkedOn?: string;
}>;
export type Answer = Sourced<{ id: string; text: string; explanation: string }>;
export type QuestionBase = Sourced<{ id: string; prompt: string; explanation: string }>;
export type ActivityQuestion = QuestionBase & (
  | { type: 'quiz'; answers: NonEmpty<Answer>; correctAnswerId: string }
  | { type: 'matching'; pairs: NonEmpty<{ figureId: string; answer: Answer }> }
  | { type: 'ordering'; events: NonEmpty<Answer>; correctOrder: NonEmpty<string> }
  | { type: 'map'; locations: NonEmpty<MapLocation>; correctLocationId: string }
  | { type: 'classification'; items: NonEmpty<{ answer: Answer; category: Category }> }
);
export type ActivityType = ActivityQuestion['type'];
export type ActivityResult = {
  activityId: ActivityType; contentVersion: string; earned: number; possible: number; completedOn: string;
};
export type SectionId = 'home' | 'timeline' | 'front' | 'heroes' | 'homefront' | 'postwar' | 'facts' | 'videos' | 'games' | 'results' | 'sources';
export type Section = { id: SectionId; label: string; eyebrow: string; title: string; description: string };
