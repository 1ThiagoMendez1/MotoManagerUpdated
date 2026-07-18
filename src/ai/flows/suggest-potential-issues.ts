'use server';

/**
 * @fileOverview Asistencia de diagnóstico impulsada por IA para técnicos de motocicletas.
 *
 * - suggestPotentialIssues - Una función que acepta los síntomas de la motocicleta y devuelve sugerencias impulsadas por IA para posibles problemas y soluciones.
 * - SuggestPotentialIssuesInput - El tipo de entrada para la función suggestPotentialIssues.
 * - SuggestPotentialIssuesOutput - El tipo de retorno para la función suggestPotentialIssues.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPotentialIssuesInputSchema = z.object({
  symptoms: z
    .string()
    .describe('Una descripción de los síntomas de la motocicleta observados por el técnico.'),
});
export type SuggestPotentialIssuesInput = z.infer<typeof SuggestPotentialIssuesInputSchema>;

const SuggestPotentialIssuesOutputSchema = z.object({
  suggestions: z
    .string()
    .describe('Una lista de posibles problemas y soluciones basadas en los síntomas proporcionados.'),
});
export type SuggestPotentialIssuesOutput = z.infer<typeof SuggestPotentialIssuesOutputSchema>;

export async function suggestPotentialIssues(
  input: SuggestPotentialIssuesInput
): Promise<SuggestPotentialIssuesOutput> {
  return suggestPotentialIssuesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPotentialIssuesPrompt',
  input: {schema: SuggestPotentialIssuesInputSchema},
  output: {schema: SuggestPotentialIssuesOutputSchema},
  prompt: `Eres un mecánico experto en motocicletas especializado en diagnosticar problemas de motocicletas.

Utilizarás la siguiente información para sugerir posibles problemas y soluciones.

Síntomas: {{{symptoms}}}

Basado en los síntomas, proporciona una lista de posibles problemas y soluciones.
`,
});

const suggestPotentialIssuesFlow = ai.defineFlow(
  {
    name: 'suggestPotentialIssuesFlow',
    inputSchema: SuggestPotentialIssuesInputSchema,
    outputSchema: SuggestPotentialIssuesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
