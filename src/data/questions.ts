export interface Question {
  text: string;
  topic: string;
}

export interface TopicPreset {
  id: string;
  name: string;
  topics: string[];
  questions: Question[];
  customQuestions?: string[];
}

export const QUESTION_INTERVAL_SECONDS = 180;

const fallbackTopic = "Conversation";

export const topicPresets: TopicPreset[] = [
  {
    id: "icebreak",
    name: "Ice-Break",
    topics: ["Hobbies", "Bucket list items", "Fun facts"],
    questions: [
      { text: "What's a hobby you've always wanted to try?", topic: "Hobbies" },
      { text: "What's on your bucket list?", topic: "Bucket list items" },
      { text: "What's the most interesting place you've visited?", topic: "Bucket list items" },
      { text: "What's a fun fact about you that surprises people?", topic: "Fun facts" },
      { text: "If you could learn any skill instantly, what would it be?", topic: "Hobbies" },
      { text: "What's your favorite way to spend a weekend?", topic: "Hobbies" },
    ],
  },
  {
    id: "friendship",
    name: "Friendship Fast-Track",
    topics: ["Values", "Memories", "Beliefs"],
    questions: [
      { text: "What's a small tradition that means a lot to you?", topic: "Values" },
      { text: "Who has had the biggest influence on who you are today?", topic: "Values" },
      { text: "What's a memory you wish you could relive?", topic: "Memories" },
      { text: "What's something you believe now that you didn't five years ago?", topic: "Beliefs" },
      { text: "What makes you feel most at home with someone?", topic: "Values" },
      { text: "When do you feel most connected to new people?", topic: "Beliefs" },
    ],
  },
  {
    id: "career",
    name: "Career Swap",
    topics: ["Career", "Business advice", "Entrepreneurship"],
    questions: [
      { text: "What's the best business advice you've ever received?", topic: "Business advice" },
      { text: "What's the biggest lesson you've learned in your career?", topic: "Career" },
      { text: "If you could start a business tomorrow, what would it be?", topic: "Entrepreneurship" },
      { text: "What's your approach to taking risks in business?", topic: "Business advice" },
      { text: "Who's your biggest business inspiration and why?", topic: "Entrepreneurship" },
      { text: "What skill has unexpectedly helped you the most at work?", topic: "Career" },
    ],
  },
];

export const getPresetById = (id?: string | null): TopicPreset => {
  if (!id) return topicPresets[0];
  return topicPresets.find((preset) => preset.id === id) || topicPresets[0];
};

export const buildCustomPreset = (
  topics: string[] = ["Custom"],
  customQuestions: string[] = []
): TopicPreset => {
  const cleanedQuestions = customQuestions.map((q) => q.trim()).filter(Boolean);
  const questions: Question[] =
    cleanedQuestions.length > 0
      ? cleanedQuestions.map((text) => ({ text, topic: topics[0] || fallbackTopic }))
      : [];

  return {
    id: "custom",
    name: "Custom",
    topics: topics.length > 0 ? topics : ["Custom"],
    questions: questions.length > 0 ? questions : getPresetById("icebreak").questions,
    customQuestions: cleanedQuestions.length > 0 ? cleanedQuestions : undefined,
  };
};

export const resolvePresetFromSelection = (
  topicKey?: string | null,
  customTopics?: string[],
  customQuestions?: string[]
): TopicPreset => {
  if (topicKey === "custom" || (customQuestions && customQuestions.length > 0)) {
    return buildCustomPreset(customTopics || [], customQuestions || []);
  }

  if (topicKey === "career") return getPresetById("career");
  if (topicKey === "friendship") return getPresetById("friendship");

  return getPresetById(topicKey || undefined);
};

export const getRandomQuestion = (preset: TopicPreset): Question => {
  const questions = preset.questions && preset.questions.length > 0 ? preset.questions : getPresetById("icebreak").questions;
  return questions[Math.floor(Math.random() * questions.length)];
};
