import { GoogleGenAI, Type } from "@google/genai";
import { AIPlanSuggestion, Vendor } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateEventSuggestions = async (
  eventType: string,
  details: string,
  guestCount: number,
  budget: number
): Promise<AIPlanSuggestion | null> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const prompt = `
      Act as a world-class expert event planner.
      I need a highly detailed plan for a ${eventType} with exactly ${guestCount} guests and a total budget limit of ₦${budget} (Naira).
      Additional details: ${details}.
      
      Using the exact guest count and budget provided, calculate precise quantities needed for items where applicable (e.g., number of bottles of wine assuming 4 glasses per bottle and 2 glasses per guest, number of food plates + 10% buffer, number of 10-seater tables, etc.).
      
      Provide:
      1. A cohesive theme and color palette.
      2. A high-level schedule of the day.
      3. A list of critical planning steps.
      4. A highly detailed budget breakdown. Include specific quantities in the category names or descriptions where relevant (e.g. "Wine (50 bottles)").
      The budget allocations MUST sum up roughly to the total budget limit.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme: { type: Type.STRING, description: "A creative theme name and short description" },
            schedule: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "A chronological list of events for the day"
            },
            tasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Top 5-10 critical tasks to do before the event"
            },
            budgetAdvice: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  amount: { type: Type.NUMBER, description: "Recommended allocation amount" }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      const cleanText = response.text.replace(/```json|```/gi, '').trim();
      return JSON.parse(cleanText) as AIPlanSuggestion;
    }
    return null;

  } catch (error) {
    console.error("Error generating event plan:", error);
    throw error;
  }
};

export const findVendors = async (query: string): Promise<Vendor[]> => {
  try {
    // We use gemini-2.5-flash for speed and tool capability
    const model = 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model,
      contents: `Suggest 5 real-world businesses matching this request: "${query}". 
      Return the results focusing on plausible or real businesses from your knowledge base with their locations, estimated ratings, and mock/real contact info.
      
      You MUST return exactly and ONLY a valid JSON array of objects with the following exact keys for each object. Do not wrap in markdown tags or add any extra text.
      Keys: "name" (string), "category" (string), "location" (string), "rating" (string e.g., "4.8"), "contact" (string), "description" (string).`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    if (response.text) {
      // Strip markdown code blocks if present (e.g., ```json ... ```)
      const cleanText = response.text.replace(/```[a-z]*\s*|\s*```/gi, '').trim();
      return JSON.parse(cleanText) as Vendor[];
    }
    return [];
  } catch (error) {
    console.error("Error finding vendors:", error);
    return [];
  }
};

export const chatWithPlanner = async (history: {role: 'user' | 'model', content: string}[], message: string) => {
    return "I am currently optimized for full plan generation. Please use the 'Smart Plan' feature!";
};

export const generateFlyerDesigns = async (promptData: {
  theme: string;
  eventName: string;
  date: string;
  time: string;
  location: string;
  hasCustomImage: boolean;
  extraPrompt?: string;
  dimensionConfig: {
    width: number;
    height: number;
  };
}) => {
  try {
    const model = 'gemini-2.5-flash';
    
    const prompt = `
      You are a world-class graphic designer and UI engineer. 
      The user wants 1 unique, modern, and beautiful flyer design for an event.
      
      Event Details:
      - Name: ${promptData.eventName}
      - Date: ${promptData.date}
      - Time: ${promptData.time}
      - Location: ${promptData.location}
      - Selected Theme/Vibe: ${promptData.theme}
      ${promptData.extraPrompt ? `- Additional Instructions: ${promptData.extraPrompt}` : ''}
      - User has uploaded a custom image: ${promptData.hasCustomImage ? 'Yes' : 'No'}

      Generate 1 stunning flyer layout using HTML.
      Each flyer must be EXACTLY sized according to the dimensions and act like a canvas. You must wrap the entire code in exactly this wrapper: <div style="position: relative; width: ${promptData.dimensionConfig.width}px; height: ${promptData.dimensionConfig.height}px; overflow: hidden; background-color: #0f172a; color: white; display: flex; flex-direction: column;">...</div>.
      IMPORTANT CONSTRAINT: You MUST use inline styles (style="...") for ALL styling (colors, typography, layout, spacing, flexbox, grid, gradients, rounded corners, shadows). DO NOT use Tailwind CSS classes (e.g., bg-red-500, text-lg, flex, p-4) because they will not be compiled at runtime and will fail to render over.
      For backgrounds, use rich CSS linear-gradients in inline styles.
      If the user has a custom image (User has uploaded a custom image: Yes), you MUST include an image tag with src="CUSTOM_IMAGE_PLACEHOLDER" somewhere in each design (e.g., as a full background with style="opacity: 0.4; object-fit: cover; width: 100%; height: 100%; position: absolute; z-index: 0;", or in a nice rounded frame style="width: 600px; height: 400px; border-radius: 24px; object-fit: cover;"). Don't use CUSTOM_IMAGE_PLACEHOLDER if the user has not uploaded a custom image.
      If the theme is "Floral", use floral colors like rose, pink, green, and elegant serif fonts (style="font-family: serif;").
      Use layout techniques (Flexbox, Absolute positioning) to arrange the Name, Date, Time, and Location.
      Add visual flair like decorative borders, abstract shapes (e.g., divs with style="border-radius: 50%; filter: blur(30px);"), or structured dividers.

      Return the response strictly as a JSON array of objects with this exact structure:
      [
        {
          "id": "design-1",
          "name": "Design Name",
          "html": "<div style='position: relative; width: ${promptData.dimensionConfig.width}px; height: ${promptData.dimensionConfig.height}px; overflow: hidden; background-color: #0f172a; color: white;'>...</div>"
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              html: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
      const cleanText = response.text.replace(/```[a-z]*\s*|\s*```/gi, '').trim();
      const parsed = JSON.parse(cleanText) as { id: string, name: string, html: string }[];
      return parsed.map((item, index) => ({
        ...item,
        id: `design-${Date.now()}-${index}`
      }));
    }
    return [];
  } catch (error) {
    console.error("Error generating flyer designs:", error);
    throw error;
  }
};
