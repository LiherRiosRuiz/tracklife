<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFavoriteRequest;
use App\Http\Resources\FavoriteResource;
use App\Models\Favorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use MongoDB\Driver\Exception\BulkWriteException;

class FavoriteController extends Controller
{
    /**
     * MongoDB server error code for a duplicate key violation (unique index).
     *
     * @see https://www.mongodb.com/docs/manual/reference/error-codes/
     */
    private const DUPLICATE_KEY_ERROR_CODE = 11000;

    public function index(Request $request): JsonResponse
    {
        $favorites = Favorite::where('user_id', (string) $request->user()->_id)->get();

        return response()->json(['favorites' => FavoriteResource::collection($favorites)]);
    }

    public function store(StoreFavoriteRequest $request): JsonResponse
    {
        $data = $request->validated();

        $attributes = [
            'user_id' => (string) $request->user()->_id,
            'type' => $data['type'],
            'ref' => $data['ref'],
        ];

        // No hacemos find-then-insert (firstOrCreate): esa secuencia deja una
        // ventana de carrera entre el "no existe" y el "insertar" bajo
        // multiples workers PHP-FPM concurrentes. En su lugar, insertamos
        // siempre y dejamos que el indice unico (user_id, type, ref) de
        // MongoDB sea la unica fuente de verdad. Si otro request ya inserto
        // el mismo tuple (ya sea por una carrera real o por un repost
        // idempotente secuencial), MongoDB rechaza el insert con un error de
        // clave duplicada que capturamos aqui para devolver la misma
        // respuesta 200 idempotente.
        try {
            $favorite = Favorite::create($attributes);

            return response()->json(['favorite' => new FavoriteResource($favorite)], 201);
        } catch (BulkWriteException $e) {
            if ($e->getCode() !== self::DUPLICATE_KEY_ERROR_CODE) {
                throw $e;
            }

            $favorite = Favorite::where($attributes)->firstOrFail();

            return response()->json(['favorite' => new FavoriteResource($favorite)], 200);
        }
    }

    public function destroy(StoreFavoriteRequest $request): JsonResponse
    {
        $data = $request->validated();

        Favorite::where('user_id', (string) $request->user()->_id)
            ->where('type', $data['type'])
            ->where('ref', $data['ref'])
            ->delete();

        return response()->json(['message' => 'Favorito eliminado']);
    }
}
