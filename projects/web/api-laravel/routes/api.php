<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BiometricController;
use App\Http\Controllers\Api\ChallengeController;
use App\Http\Controllers\Api\ClubController;
use App\Http\Controllers\Api\CoachController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExerciseController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\Api\FollowController;
use App\Http\Controllers\Api\FoodController;
use App\Http\Controllers\Api\MacroController;
use App\Http\Controllers\Api\MealController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\RecipeController;
use App\Http\Controllers\Api\UserProfileController;
use App\Http\Controllers\Api\UserSearchController;
use App\Http\Controllers\Api\WorkoutController;
use App\Http\Controllers\Api\WorkoutPlanController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Liveness + dependency check. It used to return a fixed 'ok' literal, so an
// uptime monitor would report green while MongoDB was unreachable and every
// real endpoint was failing — the probe's whole job, unmet. Matters more once
// the database is a separate network service (Atlas) rather than a sibling
// container.
Route::get('/health', function () {
    try {
        DB::connection('mongodb')->getMongoClient()->selectDatabase(
            config('database.connections.mongodb.database')
        )->command(['ping' => 1]);
    } catch (Throwable $e) {
        // 503 so monitors and load balancers act on it; no exception detail in
        // the body — this endpoint is public.
        return response()->json(['status' => 'degraded', 'app' => 'TRACKLIFE API', 'database' => 'unreachable'], 503);
    }

    return response()->json(['status' => 'ok', 'app' => 'TRACKLIFE API', 'database' => 'ok']);
});

// Stricter throttle on top of the api-wide baseline: brute-force/enumeration
// protection for the two unauthenticated auth endpoints.
Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1,auth-strict');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1,auth-strict');

Route::get('/challenges', [ChallengeController::class, 'index']);
Route::get('/challenges/{id}', [ChallengeController::class, 'show']);
Route::get('/clubs', [ClubController::class, 'index']);
Route::get('/products/barcode/{barcode}', [ProductController::class, 'byBarcode']);
Route::get('/products/{id}', [ProductController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Feed reads privacy-sensitive content (see FeedService visibility
    // filtering), so it must be authenticated like every other feed action.
    Route::get('/feed', [FeedController::class, 'index']);

    Route::get('/meals', [MealController::class, 'index']);
    Route::post('/meals', [MealController::class, 'store']);
    Route::put('/meals/{id}', [MealController::class, 'update']);
    Route::delete('/meals/{id}', [MealController::class, 'destroy']);

    Route::get('/foods/search', [FoodController::class, 'search']);
    Route::get('/users/search', [UserSearchController::class, 'search']);
    Route::get('/users/{id}/profile', [UserProfileController::class, 'show']);
    Route::post('/products/scan', [ProductController::class, 'scan']);

    // Follows: {id} is a Mongo ObjectId hex, safe as a path segment (matches
    // the neighbouring /users/{id}/profile shape).
    Route::get('/follows', [FollowController::class, 'index']);
    Route::post('/users/{id}/follow', [FollowController::class, 'store']);
    Route::delete('/users/{id}/follow', [FollowController::class, 'destroy']);

    Route::get('/macros/targets', [MacroController::class, 'targets']);
    Route::put('/macros/targets', [MacroController::class, 'updateTargets']);
    Route::get('/macros/progress', [MacroController::class, 'dailyProgress']);

    Route::get('/recipes', [RecipeController::class, 'index']);
    Route::post('/recipes', [RecipeController::class, 'store']);
    Route::get('/recipes/{id}', [RecipeController::class, 'show']);

    Route::post('/feed', [FeedController::class, 'store']);
    Route::post('/feed/{id}/like', [FeedController::class, 'like']);
    Route::post('/feed/{id}/comments', [FeedController::class, 'comment']);

    Route::post('/challenges/{id}/join', [ChallengeController::class, 'join']);

    Route::put('/profile', [UserProfileController::class, 'update']);

    // Workout Plans
    Route::get('/workout-plans', [WorkoutPlanController::class, 'index']);
    Route::post('/workout-plans', [WorkoutPlanController::class, 'store']);
    Route::get('/workout-plans/{id}', [WorkoutPlanController::class, 'show']);
    Route::put('/workout-plans/{id}', [WorkoutPlanController::class, 'update']);
    Route::delete('/workout-plans/{id}', [WorkoutPlanController::class, 'destroy']);

    // from-plan MUST be BEFORE /workouts/{id}
    Route::post('/workouts/from-plan/{planId}', [WorkoutController::class, 'fromPlan']);

    Route::get('/workouts', [WorkoutController::class, 'index']);
    Route::post('/workouts', [WorkoutController::class, 'store']);
    Route::get('/workouts/{id}', [WorkoutController::class, 'show']);

    // Favorites
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites', [FavoriteController::class, 'store']);
    Route::delete('/favorites', [FavoriteController::class, 'destroy']);

    Route::get('/exercises', [ExerciseController::class, 'index']);
    Route::post('/exercises', [ExerciseController::class, 'store']);
    Route::get('/exercises/{id}', [ExerciseController::class, 'show']);
    Route::put('/exercises/{id}', [ExerciseController::class, 'update']);

    Route::get('/activities', [ActivityController::class, 'index']);
    Route::post('/activities', [ActivityController::class, 'store']);
    Route::get('/activities/{id}', [ActivityController::class, 'show']);

    Route::get('/biometrics', [BiometricController::class, 'index']);
    Route::post('/biometrics', [BiometricController::class, 'store']);
    Route::get('/biometrics/today', [BiometricController::class, 'today']);

    // Las rutas de wearables se eliminaron: sync() fabricaba lecturas con rand()
    // y las persistía como reales, alimentando biométricos y los consejos del
    // coach. Cuando exista OAuth real, cualquier token DEBE guardarse con el cast
    // `encrypted` (o un almacén de secretos), nunca como string plano.
    Route::get('/coach/daily', [CoachController::class, 'daily']);

    Route::post('/clubs', [ClubController::class, 'store']);
    Route::get('/clubs/{id}', [ClubController::class, 'show']);
    Route::post('/clubs/{id}/join', [ClubController::class, 'join']);
});
