<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (User::where('email', $data['email'])->exists()) {
            throw ValidationException::withMessages(['email' => ['El email ya está registrado.']]);
        }

        $username = $data['username'] ?? Str::slug(Str::before($data['email'], '@'));

        if (User::where('username', $username)->exists()) {
            $username .= '-'.Str::lower(Str::random(4));
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'username' => $username,
            'password' => $data['password'],
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        $token = $user->createToken('tracklife')->plainTextToken;

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            // Deliberately no password in this log line — visibility into
            // brute-force/enumeration attempts without leaking credentials.
            Log::warning('Failed login attempt', [
                'email' => $data['email'],
                'ip' => $request->ip(),
            ]);

            throw ValidationException::withMessages(['email' => ['Credenciales incorrectas.']]);
        }

        $token = $user->createToken('tracklife')->plainTextToken;

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => new UserResource($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Sesión cerrada']);
    }

}
