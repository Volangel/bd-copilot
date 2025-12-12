import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pickNextSequenceStep } from "@/lib/sequences/nextStep";
import { decideNewChannelPreference } from "@/lib/contacts/channelPreference";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const postSchema = z.object({
  stepId: z.string().min(1, "stepId is required"),
  action: z.enum(["sent", "skip", "reschedule"]).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const steps = await prisma.sequenceStep.findMany({
      where: { status: "PENDING", sequence: { userId: session.user.id } },
      include: { sequence: { include: { project: true, contact: true } } },
    });
    const picked = pickNextSequenceStep(
      steps.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        status: s.status,
        scheduledAt: s.scheduledAt,
      })),
      new Date(),
    );
    if (!picked) {
      if (steps.length > 0) {
        console.warn("SEQUENCE_WARNING: no next step found", { userId: session.user.id, sequenceCount: steps.length });
      }
      return NextResponse.json({ step: null });
    }
    const full = steps.find((s) => s.id === picked.id) || null;
    return NextResponse.json(full);
  } catch (err) {
    console.error("next-step GET failed", { userId: session.user.id, err });
    return NextResponse.json({ error: "Failed to load next step" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate request body with Zod
  const parseResult = postSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid payload" }, { status: 400 });
  }
  const { stepId, action, scheduledAt } = parseResult.data;

  try {
    const step = await prisma.sequenceStep.findFirst({
      where: { id: stepId, sequence: { userId: session.user.id } },
      include: { sequence: { include: { project: true, contact: true } } },
    });
    if (!step) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "sent") {
      await prisma.sequenceStep.update({
        where: { id: stepId },
        data: { status: "SENT", sentAt: new Date() },
      });
      // recompute next pending step for this project
      const nextPending = await prisma.sequenceStep.findFirst({
        where: { status: "PENDING", sequence: { projectId: step.sequence.projectId, userId: session.user.id } },
        orderBy: { scheduledAt: "asc" },
      });
      await prisma.project.update({
        where: { id: step.sequence.projectId, userId: session.user.id },
        data: { lastContactAt: new Date(), nextFollowUpAt: nextPending?.scheduledAt ?? null },
      });
      if (step.sequence.contact) {
        const nextPreference = decideNewChannelPreference(step.sequence.contact.channelPreference, step.channel);
        if (nextPreference !== step.sequence.contact.channelPreference) {
          await prisma.contact.update({
            where: { id: step.sequence.contactId },
            data: { channelPreference: nextPreference },
          });
        }
      }
      await prisma.interaction.create({
        data: {
          userId: session.user.id,
          projectId: step.sequence.projectId,
          contactId: step.sequence.contactId,
          sequenceStepId: step.id,
          channel: step.channel,
          type: "outbound",
          title: `Sequence step ${step.stepNumber} sent via ${step.channel}`,
          body: step.content,
        },
      });
    } else if (action === "skip") {
      await prisma.sequenceStep.update({
        where: { id: stepId },
        data: { status: "SKIPPED" },
      });
      const nextPending = await prisma.sequenceStep.findFirst({
        where: { status: "PENDING", sequence: { projectId: step.sequence.projectId, userId: session.user.id } },
        orderBy: { scheduledAt: "asc" },
      });
      await prisma.project.update({
        where: { id: step.sequence.projectId, userId: session.user.id },
        data: { nextFollowUpAt: nextPending?.scheduledAt ?? null },
      });
    } else if (action === "reschedule" && scheduledAt) {
      const newScheduledAt = new Date(scheduledAt);
      await prisma.sequenceStep.update({
        where: { id: stepId },
        data: { scheduledAt: newScheduledAt },
      });
      // Recalculate the next follow-up date for the project
      const allPendingSteps = await prisma.sequenceStep.findMany({
        where: { status: "PENDING", sequence: { projectId: step.sequence.projectId, userId: session.user.id } },
        orderBy: { scheduledAt: "asc" },
      });
      // Find the earliest scheduled pending step
      const nextFollowUp = allPendingSteps
        .filter((s) => s.scheduledAt)
        .sort((a, b) => (a.scheduledAt!.getTime() - b.scheduledAt!.getTime()))[0];
      await prisma.project.update({
        where: { id: step.sequence.projectId, userId: session.user.id },
        data: { nextFollowUpAt: nextFollowUp?.scheduledAt ?? null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("next-step POST failed", { userId: session.user.id, stepId, action, err });
    return NextResponse.json({ error: "Failed to update step" }, { status: 500 });
  }
}
