const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://api.tracklife.test";

export type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  bio?: string;
  avatar_url?: string;
  streak_days: number;
  macro_targets: MacroTargets;
  transformation_goal?: Record<string, unknown>;
  privacy_settings?: Record<string, string>;
};

export type MacroTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MacroProgress = {
  date: string;
  consumed: MacroTargets;
  targets: MacroTargets;
  streak_days: number;
};

export type FeedPost = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  kudos_count: number;
  comments: Array<{ user_name: string; text: string; created_at: string }>;
  created_at?: string;
  user?: { id: string; name: string; username: string; avatar_url?: string };
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("La petición tardó demasiado (timeout 10s)");
    }
    throw e;
  }

  clearTimeout(timeoutId);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? "Error de API");
  }

  return res.json() as Promise<T>;
}

export const api = {
  register: (data: { name: string; email: string; password: string }) =>
    request<{ user: User; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: (token: string) =>
    request<{ user: User }>("/api/auth/me", {}, token),

  logout: (token: string) =>
    request<{ message: string }>("/api/auth/logout", { method: "POST" }, token),

  dashboard: (token: string) =>
    request<{
      user: { name: string; streak_days: number };
      macros: MacroProgress;
      weekly_calories: Array<{ date: string; day: string; calories: number }>;
      recent_workouts: Array<{
        id: string;
        name: string;
        date: string;
        total_volume: number | null;
        duration_minutes: number | null;
      }>;
      insights: Array<{ type: string; severity: string; message: string }>;
      feed_preview: FeedPost[];
    }>("/api/dashboard", {}, token),

  macroProgress: (token: string, date?: string) =>
    request<MacroProgress>(
      `/api/macros/progress${date ? `?date=${date}` : ""}`,
      {},
      token,
    ),

  getMacroTargets: (token: string) =>
    request<{ targets: MacroTargets }>("/api/macros/targets", {}, token),

  updateMacroTargets: (token: string, targets: MacroTargets) =>
    request<{ targets: MacroTargets }>("/api/macros/targets", {
      method: "PUT",
      body: JSON.stringify(targets),
    }, token),

  meals: (token: string, date?: string) =>
    request<{ meals: MealEntry[] }>(
      `/api/meals${date ? `?date=${date}` : ""}`,
      {},
      token,
    ),

  createMeal: (token: string, data: Partial<MealEntry>) =>
    request<{ meal: MealEntry }>("/api/meals", {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  searchFoods: (token: string, q: string) =>
    request<{ foods: FoodItem[] }>(`/api/foods/search?q=${encodeURIComponent(q)}`, {}, token),

  productByBarcode: (barcode: string) =>
    request<{ product: Product }>(`/api/products/barcode/${barcode}`),

  scanProduct: (token: string, barcode: string, share = false) =>
    request<{ product: Product }>("/api/products/scan", {
      method: "POST",
      body: JSON.stringify({ barcode, share_to_feed: share }),
    }, token),

  feed: () => request<{ feed: FeedPost[] }>("/api/feed"),

  kudos: (token: string, postId: string) =>
    request<{ post: FeedPost }>(`/api/feed/${postId}/kudos`, { method: "POST" }, token),

  comment: (token: string, postId: string, text: string) =>
    request<{ post: FeedPost }>(`/api/feed/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }, token),

  challenges: () => request<{ challenges: Challenge[] }>("/api/challenges"),

  joinChallenge: (token: string, id: string) =>
    request<{ challenge: Challenge }>(`/api/challenges/${id}/join`, { method: "POST" }, token),

  recipes: (token: string) =>
    request<{ recipes: Recipe[] }>("/api/recipes", {}, token),

  workouts: (token: string) =>
    request<{ workouts: Workout[] }>("/api/workouts", {}, token),

  createWorkout: (token: string, data: Partial<Workout>) =>
    request<{ workout: Workout }>("/api/workouts", {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  exercises: (token: string) =>
    request<{ exercises: Exercise[] }>("/api/exercises", {}, token),

  exerciseDetail: (token: string, id: string) =>
    request<{ exercise: Exercise }>(`/api/exercises/${id}`, {}, token),

  workoutPlans: (token: string) =>
    request<{ plans: WorkoutPlan[] }>("/api/workout-plans", {}, token),

  createWorkoutPlan: (token: string, data: Partial<WorkoutPlan>) =>
    request<{ plan: WorkoutPlan }>("/api/workout-plans", {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  workoutPlan: (token: string, id: string) =>
    request<{ plan: WorkoutPlan }>(`/api/workout-plans/${id}`, {}, token),

  updateWorkoutPlan: (token: string, id: string, data: Partial<WorkoutPlan>) =>
    request<{ plan: WorkoutPlan }>(`/api/workout-plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }, token),

  deleteWorkoutPlan: (token: string, id: string) =>
    request<{ message: string }>(`/api/workout-plans/${id}`, {
      method: "DELETE",
    }, token),

  workoutFromPlan: (token: string, planId: string) =>
    request<{ workout: ActiveWorkout }>(`/api/workouts/from-plan/${planId}`, {
      method: "POST",
    }, token),

  activities: (token: string) =>
    request<{ activities: Activity[] }>("/api/activities", {}, token),

  createActivity: (token: string, data: Partial<Activity>) =>
    request<{ activity: Activity }>("/api/activities", {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  biometricsToday: (token: string) =>
    request<{ summary: Record<string, { value: number; unit: string } | null> }>(
      "/api/biometrics/today",
      {},
      token,
    ),

  biometrics: (token: string, type?: string, days = 7) =>
    request<{ readings: BiometricReading[] }>(
      `/api/biometrics?days=${days}${type ? `&type=${type}` : ""}`,
      {},
      token,
    ),

  createBiometric: (token: string, data: Partial<BiometricReading>) =>
    request<{ reading: BiometricReading }>("/api/biometrics", {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  wearables: (token: string) =>
    request<{ connections: WearableConnection[] }>("/api/wearables", {}, token),

  connectWearable: (token: string, provider: string) =>
    request<{ connection: WearableConnection }>("/api/wearables/connect", {
      method: "POST",
      body: JSON.stringify({ provider }),
    }, token),

  syncWearable: (token: string, provider: string) =>
    request<{ message: string; readings_imported: number }>(
      `/api/wearables/${provider}/sync`,
      { method: "POST" },
      token,
    ),

  coachDaily: (token: string) =>
    request<{ insights: Array<{ type: string; severity: string; message: string }> }>(
      "/api/coach/daily",
      {},
      token,
    ),

  clubs: () => request<{ clubs: Club[] }>("/api/clubs"),

  joinClub: (token: string, id: string) =>
    request<{ club: Club }>(`/api/clubs/${id}/join`, { method: "POST" }, token),

  updateProfile: (token: string, data: Record<string, unknown>) =>
    request<{ user: User }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }, token),
};

export type MealEntry = {
  _id?: string;
  id?: string;
  meal_type: string;
  items: FoodItem[];
  totals: MacroTargets;
  date: string;
  notes?: string;
  shared_to_feed?: boolean;
};

export type FoodItem = {
  name: string;
  quantity?: number;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  barcode?: string;
};

export type Product = {
  _id?: string;
  id?: string;
  barcode: string;
  name: string;
  brand?: string;
  health_score: number;
  alerts?: string[];
  nutriments?: Record<string, number>;
  image_url?: string;
};

export type Recipe = {
  _id?: string;
  title: string;
  description?: string;
  totals_per_serving?: MacroTargets;
};

export type Challenge = {
  _id?: string;
  title: string;
  description?: string;
  participant_ids?: string[];
  is_active?: boolean;
};

export type Club = {
  _id?: string;
  name: string;
  description?: string;
  member_ids?: string[];
};

export type Workout = {
  _id?: string;
  name: string;
  sets: Array<{ exercise: string; exercise_id?: string; set_number?: number; weight: number; reps: number; type?: string }>;
  total_volume?: number;
  date?: string;
  duration_minutes?: number | null;
  shared_to_feed?: boolean;
};

export type Exercise = {
  _id?: string;
  name: string;
  muscle_group?: string;
  equipment?: string;
  category?: string;
  instructions?: string[];
  tips?: string[];
  image_url?: string;
  muscles_primary?: string[];
  muscles_secondary?: string[];
  is_custom?: boolean;
  force?: string;
  level?: string;
};

export type PlanSet = {
  set_number: number;
  type: "normal" | "warmup" | "dropset" | "failure";
  reps: number;
  weight: number;
  rest_seconds: number;
};

export type PlanExercise = {
  exercise_id: string;
  exercise_name: string;
  order: number;
  sets: PlanSet[];
};

export type WorkoutPlan = {
  _id?: string;
  name: string;
  description?: string;
  days_per_week?: number;
  exercises: PlanExercise[];
  is_public?: boolean;
};

export type ActiveWorkoutSet = {
  exercise: string;
  exercise_id: string;
  set_number: number;
  type: string;
  weight: number;
  reps: number;
  rest_seconds: number;
  completed: boolean;
};

export type ActiveWorkout = {
  name: string;
  plan_id?: string;
  date: string;
  sets: ActiveWorkoutSet[];
  duration_minutes: number | null;
};

export type Activity = {
  _id?: string;
  type: string;
  title: string;
  distance_km?: number;
  duration_minutes?: number;
  shared_to_feed?: boolean;
};

export type BiometricReading = {
  type: string;
  value: number;
  unit?: string;
  timestamp?: string;
};

export type WearableConnection = {
  provider: string;
  status: string;
  last_sync_at?: string;
};
