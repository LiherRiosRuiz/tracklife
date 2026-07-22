<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeedCommentRequest;
use App\Http\Requests\StoreFeedPostRequest;
use App\Models\SocialPost;
use App\Services\FeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedController extends Controller
{
    public function __construct(private FeedService $feedService) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = 50;
        $page = max(1, (int) $request->query('page', 1));

        // See FeedService::paginateVisiblePosts for why privacy filtering
        // can't be applied after a fixed-size ->skip()->take()->get(): it
        // can silently under-deliver a page when posts in that window
        // aren't visible to the viewer.
        $feed = $this->feedService->paginateVisiblePosts(
            SocialPost::orderBy('created_at', 'desc'),
            $request->user(),
            ($page - 1) * $perPage,
            $perPage
        );

        return response()->json([
            'feed' => $feed,
        ]);
    }

    public function store(StoreFeedPostRequest $request): JsonResponse
    {
        $data = $request->validated();

        $post = $this->feedService->createPost($request->user(), $data['type'], $data['payload']);

        return response()->json(['post' => $this->feedService->formatPost($post)], 201);
    }

    public function kudos(Request $request, string $id): JsonResponse
    {
        $post = SocialPost::findOrFail($id);

        if (! $this->feedService->canView($post, $request->user())) {
            abort(404);
        }

        $userId = (string) $request->user()->_id;
        $kudos = $post->kudos_user_ids ?? [];

        if (! in_array($userId, $kudos, true)) {
            $kudos[] = $userId;
            $post->kudos_user_ids = $kudos;
            $post->kudos_count = count($kudos);
            $post->save();
        }

        return response()->json(['post' => $this->feedService->formatPost($post->fresh())]);
    }

    public function comment(StoreFeedCommentRequest $request, string $id): JsonResponse
    {
        $data = $request->validated();
        $post = SocialPost::findOrFail($id);

        if (! $this->feedService->canView($post, $request->user())) {
            abort(404);
        }

        $comments = $post->comments ?? [];
        $comments[] = [
            'user_id' => (string) $request->user()->_id,
            'user_name' => $request->user()->name,
            'text' => $data['text'],
            'created_at' => now()->toIso8601String(),
        ];

        $post->comments = $comments;
        $post->save();

        return response()->json(['post' => $this->feedService->formatPost($post->fresh())]);
    }
}
