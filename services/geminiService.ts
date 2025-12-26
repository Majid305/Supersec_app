import { GoogleGenAI, Type } from "@google/genai";
import { DocumentData, DocLanguage, DocStatus, RejectedCheck, CheckRejectionClass, CheckSituation } from "../types";

const getAI = () => {
  // On utilise process.env.API_KEY qui sera injecté par Vite lors du build sur Vercel
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey.length < 5) {
    throw new Error("Clé API manquante. L'IA n'est pas activée sur ce déploiement. Vérifiez les Variables d'Environnement Vercel et refaites un déploiement.");
  }
  return new GoogleGenAI({ apiKey });
};

const documentSchema = {
  type: Type.OBJECT,
  properties: {
    langue_document: { type: Type.STRING, description: "Langue du document : 'Français' ou 'Arabe'" },
    type_objet: { type: Type.STRING, description: "Type de document (Lettre, Facture, Réclamation, etc.)" },
    date_document: { type: Type.STRING, description: "Date au format YYYY-MM-DD" },
    objet: { type: Type.STRING, description: "Objet succinct" },
    emetteur: { type: Type.STRING, description: "Nom de l'émetteur" },
    destinataire: { type: Type.STRING, description: "Nom du destinataire" },
    reference: { type: Type.STRING, description: "Numéro de référence" },
    resume: { type: Type.STRING, description: "Résumé détaillé du contenu" },
    suite_a_reserver: { type: Type.STRING, description: "Action suggérée ou suite à donner" },
    observation: { type: Type.STRING, description: "Observations particulières" },
    autres_infos: { type: Type.STRING, description: "Contacts ou autres informations utiles" }
  },
  required: ["langue_document", "type_objet", "objet", "resume"]
};

const checkSchema = {
  type: Type.OBJECT,
  properties: {
    banque: { type: Type.STRING, description: "Nom de la banque" },
    numero_cheque: { type: Type.STRING, description: "Numéro du chèque" },
    numero_compte: { type: Type.STRING, description: "Numéro de compte" },
    rib: { type: Type.STRING, description: "RIB complet (24 chiffres si possible)" },
    montant: { type: Type.NUMBER, description: "Montant numérique" },
    date_rejet: { type: Type.STRING, description: "Date de rejet au format YYYY-MM-DD" },
    motif_rejet: { type: Type.STRING, description: "Motif du rejet" },
    classe_rejet: { type: Type.STRING, description: "Classe : 'Fond' (solde insuffisant) ou 'Forme' (signature, date, etc.)" },
    agence: { type: Type.STRING, description: "Agence bancaire" },
    ville: { type: Type.STRING, description: "Ville mentionnée sur le chèque" },
    nom_proprietaire: { type: Type.STRING, description: "Nom du tireur (propriétaire du compte)" },
    nom_beneficiaire: { type: Type.STRING, description: "Nom du bénéficiaire" },
    encaisseur: { type: Type.STRING, description: "Nom de la personne ayant déposé le chèque" },
    observation: { type: Type.STRING, description: "Notes ou observations supplémentaires" }
  },
  required: ["banque", "numero_cheque", "montant"]
};

export const analyzeDocument = async (base64Image: string, mimeType: string): Promise<Partial<DocumentData>> => {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  const prompt = "Analyse ce document administratif et extrais les informations structurées en JSON. Si le texte est en Arabe, traduis l'objet et le résumé en Français mais garde les noms propres si nécessaire.";

  const result = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Image.split(',')[1], mimeType } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: documentSchema
    }
  });

  try {
    return JSON.parse(result.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return {};
  }
};

export const analyzeCheck = async (base64Image: string, mimeType: string): Promise<Partial<RejectedCheck>> => {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  const prompt = "Analyse ce chèque bancaire (éventuellement avec son avis de rejet). Extraits le RIB (24 chiffres), le montant, le numéro de chèque, la banque, la ville, et identifie le propriétaire (tireur) ainsi que le bénéficiaire.";

  const result = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Image.split(',')[1], mimeType } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: checkSchema
    }
  });

  try {
    return JSON.parse(result.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return {};
  }
};

export const generateResponse = async (doc: DocumentData, instruction: string): Promise<string> => {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  const prompt = `En tant qu'assistant administratif, rédige une réponse ou une note suite à ce document :
  Objet : ${doc.objet}
  Résumé : ${doc.resume}
  Émetteur : ${doc.emetteur}
  Instruction de l'utilisateur : ${instruction}
  
  Rédige un texte professionnel, clair et concis.`;

  const result = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return result.text || "";
};

export const generateReportSynthesis = async (docs: DocumentData[], period: string, typeFilter: string): Promise<string> => {
  const ai = getAI();
  const model = "gemini-3-pro-preview";

  const summaryData = docs.slice(0, 15).map(d => `- Objet: ${d.objet} | Résumé: ${d.resume.substring(0, 100)}...`).join('\n');

  const prompt = `Analyse les flux administratifs suivants pour la période de ${period} (Filtre: ${typeFilter}).
  Documents (échantillon des ${docs.length} traités) :
  ${summaryData}
  
  Produis un rapport de synthèse d'expertise structuré en 4 points :
  1. Tendances globales des flux (volume et récurrence).
  2. Analyse critique des objets traités (points d'attention).
  3. Recommandations stratégiques pour l'optimisation.
  4. Conclusion sur l'efficacité opérationnelle.
  
  Le ton doit être formel et analytique.`;

  const result = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return result.text || "";
};