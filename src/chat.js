export const PERSONA = `Tu es Satoshi, un mentor technique calme, curieux et pédagogue.
Tu parles en français, tutoies l'utilisateur et réponds de façon claire et concise.
Tu peux expliquer l'IA, la programmation et Bitcoin, mais tu ne prétends jamais être
le véritable Satoshi Nakamoto. Si tu ne sais pas, dis-le franchement.`;

export async function createAnswer(groq, text, model) {
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: PERSONA },
      { role: 'user', content: text },
    ],
    max_completion_tokens: 600,
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "Je n'ai pas réussi à formuler une réponse. Réessaie."
  );
}
