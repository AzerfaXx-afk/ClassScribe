export const summarizeTranscript = async (t, k, lang = 'fr') => {
    const prompts = {
        fr: `Tu es un assistant d'étude prodige. Voici la transcription d'un cours: "${t}". 
      
      CONSIGNES:
      1. Différencie le cours magistral du professeur des questions d'élèves ou bavardages.
      2. Rédige un RÉSUMÉ MAGISTRAL structuré : 
         - L'Essentiel (3-4 phrases)
         - Points Clés & Concepts (bullet points)
         - Dates/Chiffres importants
         - Vocabulaire technique
      
      IMPORTANT: Ignore totalement les hors-sujets ou les interventions inutiles des élèves.`,
        en: `You are a prodigy study assistant. Here is a course transcript: "${t}". 
      
      INSTRUCTIONS:
      1. Differentiate the teacher's lecture from student questions or chatter.
      2. Write a structured LECTURE SUMMARY: 
         - The Essentials (3-4 sentences)
         - Key Points & Concepts (bullet points)
         - Important Dates/Numbers
         - Technical Vocabulary
      
      IMPORTANT: Completely ignore off-topic remarks or useless student interventions.`,
        es: `Eres un asistente de estudio prodigio. Aquí hay una transcripción de clase: "${t}".
      
      INSTRUCCIONES:
      1. Diferencia la clase magistral del profesor de las preguntas o charlas de estudiantes.
      2. Escribe un RESUMEN MAGISTRAL estructurado:
         - Lo Esencial (3-4 frases)
         - Puntos Clave & Conceptos (viñetas)
         - Fechas/Números importantes
         - Vocabulario técnico
      
      IMPORTANTE: Ignora totalmente los comentarios fuera de tema o intervenciones inútiles de estudiantes.`,
        de: `Du bist ein genialer Lernassistent. Hier ist ein Kursprotokoll: "${t}".
      
      ANWEISUNGEN:
      1. Unterscheide die Vorlesung des Professors von Studentenfragen oder Geplauder.
      2. Schreibe eine strukturierte VORLESUNGSZUSAMMENFASSUNG:
         - Das Wesentliche (3-4 Sätze)
         - Kernpunkte & Konzepte (Aufzählungspunkte)
         - Wichtige Daten/Zahlen
         - Fachvokabular
      
      WICHTIG: Ignoriere völlig themenfremde Bemerkungen oder unnötige Studenteninterventionen.`,
        ar: `أنت مساعد دراسة عبقري. إليك نص محاضرة: "${t}".
      
      تعليمات:
      1. فرّق بين محاضرة الأستاذ وأسئلة أو دردشة الطلاب.
      2. اكتب ملخصاً منظماً للمحاضرة:
         - الأساسيات (3-4 جمل)
         - النقاط والمفاهيم الرئيسية
         - التواريخ/الأرقام المهمة
         - المصطلحات التقنية
      
      مهم: تجاهل تماماً التعليقات الخارجة عن الموضوع أو تدخلات الطلاب غير المفيدة.`
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${k}` },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompts[lang] || prompts.fr }]
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
};

export const chatWithAI = async (messages, context, apiKey, lang = 'fr') => {
    const systemPrompts = {
        fr: `Tu es un assistant d'étude intelligent et bienveillant appelé ClassScribe AI. Tu aides les étudiants à comprendre leurs notes de cours et leur journal. Réponds de manière claire, concise et pédagogique. Voici le contexte de l'étudiant:\n\n${context}`,
        en: `You are a smart and kind study assistant called ClassScribe AI. You help students understand their course notes and journal. Respond clearly, concisely, and pedagogically. Here is the student's context:\n\n${context}`,
        es: `Eres un asistente de estudio inteligente y amable llamado ClassScribe AI. Ayudas a los estudiantes a entender sus notas de clase y diario. Responde de manera clara, concisa y pedagógica. Aquí está el contexto del estudiante:\n\n${context}`,
        de: `Du bist ein intelligenter und freundlicher Lernassistent namens ClassScribe AI. Du hilfst Schülern, ihre Kursnotizen und ihr Tagebuch zu verstehen. Antworte klar, präzise und pädagogisch. Hier ist der Kontext des Schülers:\n\n${context}`,
        ar: `أنت مساعد دراسة ذكي ولطيف يسمى ClassScribe AI. تساعد الطلاب على فهم ملاحظات دروسهم ويومياتهم. أجب بوضوح وإيجاز وبشكل تعليمي. هنا سياق الطالب:\n\n${context}`,
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompts[lang] || systemPrompts.fr },
                ...messages
            ],
            max_tokens: 1000
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
};

export const analyzeJournal = async (pages, apiKey, lang = 'fr') => {
    const pagesText = pages.map((p, i) => `Page ${i + 1} - ${p.title} (${p.date}):\n${p.content}`).join('\n\n---\n\n');

    const prompts = {
        fr: `Tu es un assistant d'étude expert en rapports de stage. Voici les pages du journal de bord d'un stagiaire:\n\n${pagesText}\n\nAnalyse ce journal et fournis:\n1. Un résumé global de l'expérience\n2. Les compétences développées\n3. Les points forts et axes d'amélioration\n4. Des suggestions pour le rapport de stage final`,
        en: `You are an expert internship report study assistant. Here are the pages of an intern's logbook:\n\n${pagesText}\n\nAnalyze this journal and provide:\n1. An overall summary of the experience\n2. Skills developed\n3. Strengths and areas for improvement\n4. Suggestions for the final internship report`,
        es: `Eres un asistente experto en informes de prácticas. Aquí están las páginas del diario de un practicante:\n\n${pagesText}\n\nAnaliza este diario y proporciona:\n1. Un resumen general de la experiencia\n2. Competencias desarrolladas\n3. Fortalezas y áreas de mejora\n4. Sugerencias para el informe final de prácticas`,
        de: `Du bist ein Experte für Praktikumsberichte. Hier sind die Seiten des Praktikumstagebuchs:\n\n${pagesText}\n\nAnalysiere dieses Tagebuch und liefere:\n1. Eine Gesamtzusammenfassung der Erfahrung\n2. Entwickelte Kompetenzen\n3. Stärken und Verbesserungsbereiche\n4. Vorschläge für den abschließenden Praktikumsbericht`,
        ar: `أنت خبير في تقارير التدريب. هنا صفحات دفتر يوميات المتدرب:\n\n${pagesText}\n\nحلل هذا الدفتر وقدم:\n1. ملخص شامل للتجربة\n2. المهارات المكتسبة\n3. نقاط القوة ومجالات التحسين\n4. اقتراحات لتقرير التدريب النهائي`,
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompts[lang] || prompts.fr }]
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
};
