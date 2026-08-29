<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFollowRequest;
use App\Models\Follow;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use MongoDB\Driver\Exception\BulkWriteException;

class FollowController extends Controller
{
    /**
     * MongoDB server error code for a duplicate key violation (unique index).
     *
     * @see https://www.mongodb.com/docs/manual/reference/error-codes/
     */
    private const DUPLICATE_KEY_ERROR_CODE = 11000;

    public function index(Request $request): JsonResponse
    {
        $followingIds = Follow::where('follower_id', (string) $request->user()->_id)
            ->pluck('followed_id')
            ->map(fn ($id) => (string) $id)
            ->values()
            ->all();

        return response()->json(['following_ids' => $followingIds]);
    }

    public function store(StoreFollowRequest $request, string $id): JsonResponse
    {
        abort_if(! User::find($id), 404);

        $attributes = [
            'follower_id' => (string) $request->user()->_id,
            'followed_id' => $id,
        ];

        // Insert always, catch the unique-index violation on a duplicate —
        // same rationale as FavoriteController::store(): a find-then-insert
        // leaves a race window across concurrent PHP-FPM workers, so the
        // unique index (follower_id, followed_id) is the single source of
        // truth for "already following".
        try {
            Follow::create($attributes);

            return response()->json(['following' => true], 201);
        } catch (BulkWriteException $e) {
            if ($e->getCode() !== self::DUPLICATE_KEY_ERROR_CODE) {
                throw $e;
            }

            return response()->json(['following' => true], 200);
        }
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        Follow::where('follower_id', (string) $request->user()->_id)
            ->where('followed_id', $id)
            ->delete();

        return response()->json(['following' => false]);
    }
}
