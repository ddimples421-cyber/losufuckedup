import { DocumentState } from './types';

export const SAMPLE_DOCUMENTS: DocumentState[] = [
  {
    id: 'speed-illusion',
    title: 'The Illusion of Velocity in Software Engineering',
    summary: 'Why shipping 20 shallow features creates the appearance of progress while quietly suffocating product soul.',
    editorialNotes: 'Tuned for an analytical, essays-first perspective with deliberate contrasts between busyness and genuine leverage.',
    updatedAt: Date.now() - 3600000,
    content: `Most engineering organizations suffer from an obsession with kinetic movement. We celebrate PRs closed, sprint velocity cards dragged into the Done column, and the weekly release train leaving the station on time. It feels like triumph because motion is visible, measurable, and flattering to management dashboards.

Yet velocity without direction is merely friction wearing down the machine. When you examine products that endure, their creators did not operate on an assembly line. They spent agonizing weeks stripping out superfluous knobs, arguing over the typography of an error message, and debating whether a second settings panel needed to exist at all.

Modern software is drowning in half-baked features because saying "we built it" is cheap, whereas refining an experience until it feels inevitable is torturously difficult. True productivity in software is not the rate of code produced, but the clarity of thought distilled into the final artifact.

If you want to move quickly next year, you must be willing to slow down this afternoon. Great software is not an accumulation of solved tickets; it is an act of ruthless editorial restraint.`
  },
  {
    id: 'architecture-attention',
    title: 'Designing for Human Stillness',
    summary: 'A manifesto for software that acts like a patient tool rather than an eager slot machine.',
    editorialNotes: 'Calm, authoritative prose emphasizing tactile analog qualities in digital spaces.',
    updatedAt: Date.now() - 86400000,
    content: `A carpenter's chisel does not vibrate in your pocket when you lay it on the workbench. It does not send you push notifications at 9:00 PM reminding you that a block of cherry wood hasn't been carved in three days. It waits in silence, balanced and ready, until your hands call upon it.

Somewhere along the path of digital consumer tech, we confused utility with engagement. We rewarded products for capturing human gaze rather than liberating human capability. Every badge, unread dot, and algorithmic bait was engineered to provoke urgency where none belonged.

A truly elegant tool respects human stillness. When you open a quiet writing studio, your pulse should decelerate. The interface should recede into the wood grain of the screen, leaving only the rhythm of your sentence and the quiet hum of your own ideas taking shape.`
  }
];
