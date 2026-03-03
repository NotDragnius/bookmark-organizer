import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req: Request) => {
    try {
        const payload = await req.json()
        // Triggered by INSERT webhook on bookmarks table
        const record = payload.record;

        if (!record || !record.url) {
            return new Response(JSON.stringify({ error: 'No URL provided' }), { status: 400 })
        }

        if (record.ai_summary) {
            // Already processed
            return new Response(JSON.stringify({ message: 'Already processed' }), { status: 200 })
        }

        const { url, id } = record;

        // 1. Fetch page content (basic fetch to grab text, not perfect for SPAs)
        let pageContent = "";
        try {
            const pageRes = await fetch(url);
            const html = await pageRes.text();
            // Naive extraction: just take the first chunks or try to strip tags
            pageContent = html.replace(/<[^>]*>?/gm, '').substring(0, 5000) // Keep it brief for the prompt
        } catch (e) {
            console.error("Failed to fetch page content:", e);
            pageContent = "Failed to load page content. Rely on the URL to generate a summary.";
        }

        // 2. Call Gemini 1.5 Flash API
        const prompt = `
    Analyze the following webpage content and provide:
    1. A concise 2-sentence summary.
    2. Exactly 3 relevant tags related to the content.
    3. A suggested reminder date in ISO 8601 format (e.g., to review this bookmark), usually within 3-7 days.
    
    Format the output strictly as JSON with keys: "ai_summary", "tags" (array of strings), "reminder_date".
    
    URL: ${url}
    Content Snippet: ${pageContent}
    `;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            throw new Error(`Gemini API error: ${errText}`);
        }

        const geminiData = await geminiRes.json();
        const resultText = geminiData.candidates[0].content.parts[0].text;

        // Parse Gemini's JSON output
        const result = JSON.parse(resultText);

        // 3. Update the database record
        const { error: updateError } = await supabase
            .from('bookmarks')
            .update({
                ai_summary: result.ai_summary,
                tags: result.tags,
                reminder_date: result.reminder_date
            })
            .eq('id', id);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ message: 'Bookmark processed successfully', updated_id: id }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
