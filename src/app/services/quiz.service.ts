import { Injectable, signal, computed } from '@angular/core';
import { ApiService, ApiQuestion, QuizStartResponse, QuizResults } from './api.service';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number | null;
  category: string;
}

export interface QuizState {
  sessionId: number | null;
  currentQuestionIndex: number;
  score: number;
  answers: (number | null)[];
  timeRemaining: number;
  isCompleted: boolean;
  startTime: Date | null;
  endTime: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private questions: Question[] = [];
  private correctAnswers: Map<number, number> = new Map();

  readonly quizState = signal<QuizState>({
    sessionId: null,
    currentQuestionIndex: 0,
    score: 0,
    answers: [],
    timeRemaining: 20 * 60,
    isCompleted: false,
    startTime: null,
    endTime: null
  });

  readonly totalQuestions = computed(() => this.questions.length);
  private timeLimit = 20 * 60; // Default, overridden by server response

  private lastResults: { results: QuizResults; answers: any[] } | null = null;

  constructor(private apiService: ApiService) {}

  getQuestions(): Question[] {
    return [...this.questions];
  }

  getCurrentQuestion(): Question | null {
    const state = this.quizState();
    if (state.currentQuestionIndex < this.questions.length) {
      return this.questions[state.currentQuestionIndex];
    }
    return null;
  }

  async startQuiz(): Promise<boolean> {
    try {
      const response = await this.apiService.startQuiz();

      // Convert API questions to local format
      this.questions = response.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: null, // We don't know the answer yet
        category: q.category
      }));

      this.correctAnswers.clear();
      this.timeLimit = response.time_limit;

      this.quizState.set({
        sessionId: response.session_id,
        currentQuestionIndex: 0,
        score: 0,
        answers: new Array(this.questions.length).fill(null),
        timeRemaining: response.time_limit,
        isCompleted: false,
        startTime: new Date(),
        endTime: null
      });

      return true;
    } catch (error) {
      console.error('Failed to start quiz:', error);
      throw error;
    }
  }

  async answerQuestion(answerIndex: number): Promise<boolean> {
    const state = this.quizState();
    const currentQuestion = this.getCurrentQuestion();

    if (!currentQuestion || state.isCompleted || !state.sessionId) {
      return false;
    }

    try {
      // Submit answer to API
      const response = await this.apiService.submitAnswer(
        state.sessionId,
        currentQuestion.id,
        answerIndex
      );

      // Store the correct answer
      this.correctAnswers.set(currentQuestion.id, response.correct_answer);

      // Update the question with the correct answer
      const questionIndex = this.questions.findIndex(q => q.id === currentQuestion.id);
      if (questionIndex !== -1) {
        this.questions[questionIndex].correctAnswer = response.correct_answer;
      }

      const newAnswers = [...state.answers];
      newAnswers[state.currentQuestionIndex] = answerIndex;

      this.quizState.update(s => ({
        ...s,
        answers: newAnswers,
        score: response.is_correct ? s.score + 1 : s.score
      }));

      return response.is_correct;
    } catch (error) {
      console.error('Failed to submit answer:', error);
      return false;
    }
  }

  nextQuestion(): boolean {
    const state = this.quizState();

    if (state.currentQuestionIndex < this.questions.length - 1) {
      this.quizState.update(s => ({
        ...s,
        currentQuestionIndex: s.currentQuestionIndex + 1
      }));
      return true;
    } else {
      return false;
    }
  }

  previousQuestion(): boolean {
    const state = this.quizState();

    if (state.currentQuestionIndex > 0) {
      this.quizState.update(s => ({
        ...s,
        currentQuestionIndex: s.currentQuestionIndex - 1
      }));
      return true;
    }
    return false;
  }

  updateTime(seconds: number): void {
    this.quizState.update(s => ({
      ...s,
      timeRemaining: seconds
    }));
  }

  async completeQuiz(): Promise<void> {
    const state = this.quizState();

    if (state.isCompleted || !state.sessionId) {
      return;
    }

    const timeTaken = state.startTime
      ? Math.floor((new Date().getTime() - state.startTime.getTime()) / 1000)
      : this.timeLimit - state.timeRemaining;

    try {
      this.lastResults = await this.apiService.completeQuiz(state.sessionId, timeTaken);

      this.quizState.update(s => ({
        ...s,
        isCompleted: true,
        endTime: new Date()
      }));
    } catch (error) {
      console.error('Failed to complete quiz:', error);
      // Still mark as completed locally
      this.quizState.update(s => ({
        ...s,
        isCompleted: true,
        endTime: new Date()
      }));
    }
  }

  getResults() {
    const state = this.quizState();

    if (this.lastResults) {
      return {
        totalQuestions: this.lastResults.results.total_questions,
        correctAnswers: this.lastResults.results.correct_answers,
        wrongAnswers: this.lastResults.results.wrong_answers,
        score: this.lastResults.results.score,
        totalPoints: this.lastResults.results.total_points,
        timeTaken: this.lastResults.results.time_taken,
        percentage: this.lastResults.results.percentage,
        answers: state.answers,
        questions: this.questions.map(q => ({
          ...q,
          correctAnswer: this.correctAnswers.get(q.id) ?? q.correctAnswer ?? 0
        }))
      };
    }

    // Fallback to local calculation
    const correctAnswers = state.answers.filter((answer, index) => {
      const question = this.questions[index];
      return answer === (this.correctAnswers.get(question?.id) ?? question?.correctAnswer);
    }).length;

    const totalPoints = correctAnswers * 50;
    const timeTaken = state.startTime && state.endTime
      ? Math.floor((state.endTime.getTime() - state.startTime.getTime()) / 1000)
      : this.timeLimit - state.timeRemaining;

    return {
      totalQuestions: this.questions.length,
      correctAnswers,
      wrongAnswers: this.questions.length - correctAnswers,
      score: state.score,
      totalPoints,
      timeTaken,
      percentage: Math.round((correctAnswers / this.questions.length) * 100),
      answers: state.answers,
      questions: this.questions.map(q => ({
        ...q,
        correctAnswer: this.correctAnswers.get(q.id) ?? q.correctAnswer ?? 0
      }))
    };
  }

  resetQuiz(): void {
    this.questions = [];
    this.correctAnswers.clear();
    this.lastResults = null;

    this.quizState.set({
      sessionId: null,
      currentQuestionIndex: 0,
      score: 0,
      answers: [],
      timeRemaining: this.timeLimit,
      isCompleted: false,
      startTime: null,
      endTime: null
    });
  }
}
