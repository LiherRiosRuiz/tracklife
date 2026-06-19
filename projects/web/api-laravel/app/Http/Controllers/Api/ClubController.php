<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Club;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClubController extends Controller
{
    public function index(): JsonResponse
    {
        $clubs = Club::where('is_public', true)->orderBy('created_at', 'desc')->get();

        return response()->json(['clubs' => $clubs]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string',
            'is_public' => 'nullable|boolean',
        ]);

        $userId = (string) $request->user()->_id;

        $club = Club::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'owner_id' => $userId,
            'member_ids' => [$userId],
            'is_public' => $data['is_public'] ?? true,
        ]);

        return response()->json(['club' => $club], 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(['club' => Club::findOrFail($id)]);
    }

    public function join(Request $request, string $id): JsonResponse
    {
        $club = Club::findOrFail($id);
        $userId = (string) $request->user()->_id;
        $members = $club->member_ids ?? [];

        if (! in_array($userId, $members, true)) {
            $members[] = $userId;
            $club->member_ids = $members;
            $club->save();
        }

        return response()->json(['club' => $club->fresh()]);
    }
}
