<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeedCommentRequest;
use App\Http\Requests\StoreFeedPostRequest;
use App\Models\SocialPost;
use App\Models\User;
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
        [$post, $poster] = $this->findVisiblePostOrAbort($id, $request->user());

        $userId = (string) $request->user()->_id;
        $kudos = $post->kudos_user_ids ?? [];

        if (! in_array($userId, $kudos, true)) {
            $kudos[] = $userId;
            $post->kudos_user_ids = $kudos;
            $post->kudos_count = count($kudos);
            $post->save();
        }

        return response()->json(['post' => $this->feedService->formatPost($post->fresh(), $poster)]);
    }

    public function comment(StoreFeedCommentRequest $request, string $id): JsonResponse
    {
        $data = $request->validated();
        [$post, $poster] = $this->findVisiblePostOrAbort($id, $request->user());

        $comments = $post->comments ?? [];
        $comments[] = [
            'user_id' => (string) $request->user()->_id,
            'user_name' => $request->user()->name,
            'text' => $data['text'],
            'created_at' => now()->toIso8601String(),
        ];

        $post->comments = $comments;
        $post->save();

        return response()->json(['post' => $this->feedService->formatPost($post->fresh(), $poster)]);
    }

    /**
     * Finds $id, then requires the requesting user be allowed to see it,
     * aborting 404 either way with the SAME bare (no-message) response body
     * — a post that doesn't exist and one that exists but is hidden from
     * this viewer must be indistinguishable to the caller. Using
     * SocialPost::findOrFail() here instead would leak the model class and
     * ID in the exception message (visible whenever APP_DEBUG is on, as it
     * is in this app's local/LAN dev environment), letting an attacker use
     * response body shape to tell "doesn't exist" apart from "exists but
     * hidden" even though both return HTTP 404.
     *
     * Resolves the poster once and returns it alongside the post so callers
     * can pass it straight to formatPost() instead of triggering a second
     * identical User::find() for the same record.
     *
     * @return array{0: SocialPost, 1: ?User}
     */
    private function findVisiblePostOrAbort(string $id, ?User $viewer): array
    {
        $post = SocialPost::find($id);
        abort_if(! $post, 404);

        $poster = User::find($post->user_id);
        abort_if(! $this->feedService->canView($post, $viewer, $poster), 404);

        return [$post, $poster];
    }
}
