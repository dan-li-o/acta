/**
 * Minimal STOP/START/HELP command support so students can manage subscription state.
 */
import { createStudent, getStudentByPhone, updateStudentStatus } from '../db/queries';
import type { StudentRow } from '../db/types';

export type Command = 'START' | 'STOP' | 'HELP';

function normalizeCommand(text: string): Command | null {
  const normalized = text.trim().toUpperCase();
  if (normalized === 'START') return 'START';
  if (normalized === 'STOP') return 'STOP';
  if (normalized === 'HELP') return 'HELP';
  return null;
}

export function detectCommand(text: string): Command | null {
  return normalizeCommand(text);
}

interface CommandContext {
  fromNumber: string;
  course: string;
  instructor: string;
}

export async function handleCommand(
  command: Command,
  ctx: CommandContext
): Promise<string> {
  // Most commands pivot on whether we already know this phone number.
  let student: StudentRow | null = await getStudentByPhone(ctx.fromNumber);

  if (command === 'START') {
    if (!student) {
      student = await createStudent({
        phone: ctx.fromNumber,
        course: ctx.course,
        instructor: ctx.instructor
      });
    } else if (student.status === 'stopped') {
      await updateStudentStatus(student.id, 'active');
    }

    return "Welcome to Acta! I'm here to help you reflect on course ideas. Share a thought or question anytime.";
  }

  if (command === 'STOP') {
    if (student) {
      await updateStudentStatus(student.id, 'stopped');
    }
    return 'You are unsubscribed from Acta. Text START if you want to rejoin later.';
  }

  if (command === 'HELP') {
    if (!student) {
      student = await createStudent({
        phone: ctx.fromNumber,
        course: ctx.course,
        instructor: ctx.instructor
      });
    }

    return "Acta is your course reflection partner. Ask about the readings, share confusions, or think aloud. Commands: START to join, STOP to opt out.";
  }

  return "I didn't quite catch that. Text HELP for available commands.";
}
