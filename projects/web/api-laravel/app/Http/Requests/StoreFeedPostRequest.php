<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Only plain status updates may be posted by a client.
 *
 * The other feed types (workout_completed, meal_logged, recipe_shared,
 * product_scanned, challenge_joined, recovery_milestone, cardio_activity) are
 * created server-side by their own controllers from records that actually exist.
 * This endpoint previously accepted all of them plus a free-form payload array,
 * which let any authenticated client publish, say, a workout_completed carrying
 * an arbitrary volume with no workout behind it. Restricting the type here is
 * what keeps every metric in the feed traceable to a real record.
 */
class StoreFeedPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => 'required|string|in:status_update',
            'payload' => 'required|array',
            // A status update carries text and nothing else — no numbers a
            // reader could mistake for a measured result.
            'payload.message' => 'required|string|max:500',
        ];
    }
}
