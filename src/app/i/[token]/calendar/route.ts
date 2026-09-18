import { prisma } from "@/lib/prisma";
import { InviteStatus } from "@/generated/prisma/enums";
import { buildIcs, DATE_LENGTH_MINUTES } from "@/lib/calendar";
import { DATE_FORMATS } from "@/lib/dateFormats";
import { RESPONSE_VIEW_SELECT, toSentAnswer } from "@/lib/responseView";

// GET /i/[token]/calendar — gives the agreed date as an .ics file.
// It is a route, not a page: the answer is a file, not HTML.
// Both people use it: the invited person has this link, and the author's
// page knows the public token too.
export async function GET(
  _request: Request,
  context: RouteContext<"/i/[token]/calendar">,
) {
  const { token } = await context.params;

  const invite = await prisma.invite.findUnique({
    where: { publicToken: token },
    select: {
      authorName: true,
      format: true,
      status: true,
      response: { select: RESPONSE_VIEW_SELECT },
    },
  });

  // Only an agreed date goes to the calendar.
  if (
    !invite ||
    !invite.response ||
    invite.status !== InviteStatus.CONFIRMED
  ) {
    return new Response("There is no agreed date for this link", {
      status: 404,
    });
  }

  const answer = toSentAnswer(invite.response, invite.status);
  if (!answer.time) {
    return new Response("The date has no time", { status: 404 });
  }

  const location = [answer.place, answer.placeNote]
    .filter(Boolean)
    .join(", ");

  const ics = buildIcs({
    uid: `${token}@date-helper`,
    title: `${DATE_FORMATS[invite.format].label} date: ${invite.authorName} & ${invite.response.respondentName}`,
    start: new Date(answer.time),
    durationMinutes: DATE_LENGTH_MINUTES,
    location: location || null,
    description: "Planned with Date Helper",
  });

  return new Response(ics, {
    headers: {
      // Tells the browser this is a calendar file...
      "Content-Type": "text/calendar; charset=utf-8",
      // ...and that it should be saved (or opened) as date.ics.
      "Content-Disposition": 'attachment; filename="date.ics"',
    },
  });
}
