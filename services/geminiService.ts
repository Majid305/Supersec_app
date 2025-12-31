import { GoogleGenAI, Type } from "@google/genai";
import { DocumentData, RejectedCheck, DocLanguage, DocType } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

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
    rib: { type: Type.STRING, description: "RIB complet (24 chiffres)" },
    montant: { type: Type.NUMBER, description: "Montant numérique" },
    date_rejet: { type: Type.STRING, description: "Date de rejet YYYY-MM-DD" },
    motif_rejet: { type: Type.STRING, description: "Motif du rejet" },
    ville: { type: Type.STRING, description: "Ville du chèque" },
    nom_proprietaire: { type: Type.STRING, description: "Nom du tireur" },
    nom_beneficiaire: { type: Type.STRING, description: "Nom du bénéficiaire" },
    agence: { type: Type.STRING, description: "Agence bancaire" },
    ville_agence: { type: Type.STRING, description: "Ville de l'agence" }
  }
};

export const analyzeDocument = async (base64Image: string, mimeType: string): Promise<Partial<DocumentData>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        { text: "Tu es un expert en analyse de documents administratifs. Analyse cette image et extrais les informations demandées au format JSON. Si le document est en arabe, traduis l'objet et le résumé en français." },
        { inlineData: { data: base64Image.split(',')[1], mimeType } }
      ]
    },
    config: { 
      responseMimeType: "application/json", 
      responseSchema: documentSchema 
    }
  });

  try {
    const text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA");
    return JSON.parse(text);
  } catch (e) {
    console.error("Erreur de parsing IA Document:", e);
    throw e;
  }
};

export const analyzeCheck = async (base64Image: string, mimeType: string): Promise<Partial<RejectedCheck>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        { text: "Analyse ce chèque rejeté et extrais toutes les données bancaires et nominatives au format JSON." },
        { inlineData: { data: base64Image.split(',')[1], mimeType } }
      ]
    },
    config: { 
      responseMimeType: "application/json", 
      responseSchema: checkSchema 
    }
  });

  try {
    const text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA");
    const data = JSON.parse(text);
    return {
      ...data,
      nom_proprietaire: data.nom_proprietaire || data.tireur || "",
      nom_beneficiaire: data.nom_beneficiaire || data.beneficiaire || ""
    };
  } catch (e) {
    console.error("Erreur de parsing IA Chèque:", e);
    throw e;
  }
};

export const generateResponse = async (doc: DocumentData, instruction: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `TU ES RÉDACTEUR ADMINISTRATIF. RÉDIGE LA RÉPONSE DIRECTEMENT SANS AUCUNE PHRASE D'INTRODUCTION NI SALUTATIONS. COMMENCE DIRECTEMENT LE CONTENU.
  OBJET DU COURRIER: ${doc.objet}
  RÉSUMÉ: ${doc.resume}
  INSTRUCTION PARTICULIÈRE: ${instruction}`;
  
  const response = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt });
  let result = response.text || "";
  return result.replace(/^(Voici|Je vous|Certainement|Bien sûr|Réponse|Voici une proposition).*?[:\n]/i, "").trim();
};

export const generateObservationIA = async (check: Partial<RejectedCheck>, instruction: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `TU ES UN AUDITEUR BANCAIRE. GÉNÈRE UNE OBSERVATION PROFESSIONNELLE ET CONCISE POUR CE CHÈQUE REJETÉ. 
  COMMENCE DIRECTEMENT L'OBSERVATION SANS INTRODUCTION (PAS DE "VOICI UNE PROPOSITION", PAS DE "REMARQUE").
  Infos : Banque: ${check.banque}, N°: ${check.numero_cheque}, Montant: ${check.montant}, Motif: ${check.motif_rejet}. 
  INSTRUCTION CLIENT : ${instruction}`;
  
  const response = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt });
  let result = (response.text || "").trim();
  // Sécurité supplémentaire pour nettoyer les intros
  return result.replace(/^(Voici|Voici une observation|Remarque|L'observation|Observation).*?[:\n]/i, "").trim();
};

export const generateReportSynthesis = async (docs: DocumentData[], period: string, typeFilter: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `En tant qu'expert en gestion de flux, fais une synthèse professionnelle pour la période ${period}. Voici les objets des documents : ${docs.map(d => d.objet).join(', ')}`
  });
  return response.text || "";
};