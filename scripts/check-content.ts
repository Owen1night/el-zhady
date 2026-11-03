import { activityPlan, facts, figures, images, mapLocations, questions, sources, theses, thesisPlan, timelineEvents, videos, sections } from '../src/data/content';
import { validateContent } from '../src/lib/validate-content';
const errors = validateContent({ facts, figures, images, mapLocations, questions, theses, timelineEvents, videos }, sources);
if (thesisPlan.length !== 10) errors.push('Expected 10 thesis planning slots');
if (new Set(activityPlan.map(a => a.id)).size !== 5) errors.push('Expected 5 distinct planned activity types');
if (new Set(sections.map(s => s.id)).size !== 11) errors.push('Expected 11 sections');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Content references and structure OK. Sourced learning entries are not academically verified or assessment completion.');
