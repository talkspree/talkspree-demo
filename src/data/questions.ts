export interface Question {
  text: string;
  topic: string;
}

export interface TopicPreset {
  name: string;
  topics: string[];
  questions: Question[];
}

export const topicPresets: TopicPreset[] = [
  {
    name: "Ice-Break",
    topics: ["Hobbies", "Bucket list items", "Fun facts"],
    questions: [
      { text: "What's a hobby you've always wanted to try?", topic: "Hobbies" },
      { text: "What's on your bucket list?", topic: "Bucket list items" },
      { text: "What's the most interesting place you've visited?", topic: "Bucket list items" },
      { text: "What's a fun fact about you that surprises people?", topic: "Fun facts" },
      { text: "If you could learn any skill instantly, what would it be?", topic: "Hobbies" },
      { text: "What's your favorite way to spend a weekend?", topic: "Hobbies" },
    ]
  },
  {
    name: "Business Advice",
    topics: ["Business advice", "Career", "Entrepreneurship"],
    questions: [
      { text: "What's the best business advice you've ever received?", topic: "Business advice" },
      { text: "What's the biggest lesson you've learned in your career?", topic: "Career" },
      { text: "If you could start a business tomorrow, what would it be?", topic: "Entrepreneurship" },
      { text: "What's your approach to taking risks in business?", topic: "Business advice" },
      { text: "Who's your biggest business inspiration and why?", topic: "Entrepreneurship" },
    ]
  }
];

export const getRandomQuestion = (preset: TopicPreset): Question => {
  const questions = preset.questions;
  return questions[Math.floor(Math.random() * questions.length)];
};
