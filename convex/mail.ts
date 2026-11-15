import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// Confirmation emails after the public forms ("we got it, here is what happens next").
// Sent with Resend (https://resend.com) when RESEND_API_KEY and MAIL_FROM are set on Convex.
// Without them nothing is sent and nothing breaks: the form is saved as usual.
type Lang = "en" | "ca" | "es";
type Kind = "tryout" | "social" | "coach" | "association" | "alumni" | "access" | "contact" | "partner";
const T: Record<Kind, Record<Lang, [string, string]>> = {
  tryout: {
    en: ["We got your try-out sign-up", "Thanks for signing up for {team} try-outs. The captain will email you with the date, time and place of the next session."],
    ca: ["Hem rebut la teva inscripció a les proves", "Gràcies per inscriure't a les proves de {team}. El capità o capitana t'escriurà amb el dia, l'hora i el lloc de la propera sessió."],
    es: ["Hemos recibido tu inscripción a las pruebas", "Gracias por inscribirte a las pruebas de {team}. El capitán o capitana te escribirá con el día, la hora y el lugar de la próxima sesión."],
  },
  social: {
    en: ["You're in: playing just for fun", "Thanks for signing up to play {team} just for fun. No try-out needed: the captain will email you when the next open session or friendly is on."],
    ca: ["Ja hi ets: jugar per diversió", "Gràcies per apuntar-te a jugar a {team} per diversió. No cal fer cap prova: el capità o capitana t'escriurà quan hi hagi la propera sessió oberta o amistós."],
    es: ["Ya estás dentro: jugar por diversión", "Gracias por apuntarte a jugar a {team} por diversión. No hace falta prueba: el capitán o capitana te escribirá cuando haya la próxima sesión abierta o amistoso."],
  },
  coach: {
    en: ["Thanks for offering to coach", "Thanks for offering to coach {team}. The captain and the Operations team will read your application and get back to you by email."],
    ca: ["Gràcies per oferir-te com a entrenador", "Gràcies per oferir-te a entrenar {team}. El capità o capitana i l'equip d'Operacions llegiran la teva sol·licitud i et respondran per correu."],
    es: ["Gracias por ofrecerte como entrenador", "Gracias por ofrecerte a entrenar a {team}. El capitán o capitana y el equipo de Operaciones leerán tu solicitud y te responderán por correo."],
  },
  association: {
    en: ["We received your application", "Thanks for applying to join Esade Sports ({team}). The Board and the heads of the departments you chose will review it. We will email you about the next step."],
    ca: ["Hem rebut la teva candidatura", "Gràcies per presentar-te a Esade Sports ({team}). La Junta i els responsables dels departaments que has triat la revisaran. T'escriurem amb el següent pas."],
    es: ["Hemos recibido tu candidatura", "Gracias por presentarte a Esade Sports ({team}). La Junta y los responsables de los departamentos que has elegido la revisarán. Te escribiremos con el siguiente paso."],
  },
  alumni: {
    en: ["We received your alumni profile", "Thanks for adding your profile to the Esade Sports Alumni corner. An admin checks every profile before it goes online; you will see it on the website once it is approved."],
    ca: ["Hem rebut el teu perfil d'alumni", "Gràcies per afegir el teu perfil al racó Alumni d'Esade Sports. Un administrador revisa cada perfil abans de publicar-lo; el veuràs al web quan estigui aprovat."],
    es: ["Hemos recibido tu perfil de alumni", "Gracias por añadir tu perfil al rincón Alumni de Esade Sports. Un administrador revisa cada perfil antes de publicarlo; lo verás en la web cuando esté aprobado."],
  },
  access: {
    en: ["Your access request is waiting for approval", "We received your request to access the Esade Sports Hub as {team}. Once it is approved, sign in with this email address to create your account."],
    ca: ["La teva sol·licitud d'accés espera aprovació", "Hem rebut la teva sol·licitud d'accés al Hub d'Esade Sports com a {team}. Quan s'aprovi, inicia sessió amb aquest correu per crear el teu compte."],
    es: ["Tu solicitud de acceso espera aprobación", "Hemos recibido tu solicitud de acceso al Hub de Esade Sports como {team}. Cuando se apruebe, inicia sesión con este correo para crear tu cuenta."],
  },
  contact: {
    en: ["We got your message", "Thanks for writing to Esade Sports. Your message \"{team}\" reached the right people and they will answer you by email."],
    ca: ["Hem rebut el teu missatge", "Gràcies per escriure a Esade Sports. El teu missatge \"{team}\" ha arribat a les persones adequades i et respondran per correu."],
    es: ["Hemos recibido tu mensaje", "Gracias por escribir a Esade Sports. Tu mensaje \"{team}\" ha llegado a las personas adecuadas y te responderán por correo."],
  },
  partner: {
    en: ["Thanks for your interest in partnering", "Thanks for your interest in partnering with Esade Sports ({team}). Our Partnerships team will get back to you by email."],
    ca: ["Gràcies pel teu interès a col·laborar", "Gràcies pel teu interès a col·laborar amb Esade Sports ({team}). El nostre equip de Partnerships et respondrà per correu."],
    es: ["Gracias por tu interés en colaborar", "Gracias por tu interés en colaborar con Esade Sports ({team}). Nuestro equipo de Partnerships te responderá por correo."],
  },
};
const HELLO: Record<Lang, string> = { en: "Hello", ca: "Hola", es: "Hola" };
const BYE: Record<Lang, string> = {
  en: "Esade Sports\n(This is an automatic confirmation. You can reply to this email if you have a question.)",
  ca: "Esade Sports\n(Aquesta és una confirmació automàtica. Pots respondre aquest correu si tens cap pregunta.)",
  es: "Esade Sports\n(Esta es una confirmación automática. Puedes responder a este correo si tienes alguna pregunta.)",
};

export const confirm = internalAction({
  args: { to: v.string(), name: v.optional(v.string()), kind: v.string(), about: v.optional(v.string()), lang: v.optional(v.string()) },
  handler: async (_ctx, x): Promise<null> => {
    const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
    if (!key || !from) return null; // email not set up yet: skip quietly
    const t = T[x.kind as Kind];
    if (!t || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.to)) return null;
    const lang: Lang = x.lang === "ca" || x.lang === "es" ? x.lang : "en";
    const [subject, body] = t[lang];
    const text = `${HELLO[lang]}${x.name ? " " + x.name : ""},\n\n${body.replace("{team}", x.about ?? "Esade Sports")}\n\n${BYE[lang]}`;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [x.to], subject: `Esade Sports · ${subject}`, text }),
      });
      if (!res.ok) console.error("Confirmation email failed", res.status, (await res.text()).slice(0, 200));
    } catch (e) {
      console.error("Confirmation email failed", e);
    }
    return null;
  },
});
