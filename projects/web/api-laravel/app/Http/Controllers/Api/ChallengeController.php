<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Challenge;
use App\Services\FeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChallengeController extends Controller
{
    public function __construct(private FeedService $feedService) {}

    public function index(): JsonResponse
    {
        $challenges = Challenge::orderBy('start_date', 'desc')->get();

        return response()->json(['challenges' => $challenges]);
    }

    public function join(Request $request, string $id): JsonResponse
    {
        $challenge = Challenge::findOrFail($id);
        $userId = (string) $request->user()->_id;
        $participants = $challenge->participant_ids ?? [];

        if (! in_array($userId, $participants, true)) {
            $participants[] = $userId;
            $challenge->participant_ids = $participants;
            $challenge->save();

            $this->feedService->createPost($request->user(), 'challenge_joined', [
                'challenge_id' => (string) $challenge->_id,
                'title' => $challenge->title,
                'message' => "se unió al reto \"{$challenge->title}\"",
            ]);
        }

        return response()->json(['challenge' => $challenge->fresh()]);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(['challenge' => Challenge::findOrFail($id)]);
    }
}
