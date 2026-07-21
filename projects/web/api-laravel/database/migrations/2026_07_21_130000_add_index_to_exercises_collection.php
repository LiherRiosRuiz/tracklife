<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use MongoDB\Laravel\Schema\Blueprint;

return new class extends Migration
{
    protected $connection = 'mongodb';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // exercises: compuesto [is_custom, name] para soportar el listado
        // paginado (WHERE is_custom = false ... ORDER BY name), evitando un
        // collection scan completo cuando el catalogo crezca (ver seeder
        // preparado para las 873 filas de yuhonas/free-exercise-db).
        Schema::connection('mongodb')->table('exercises', function (Blueprint $collection) {
            $collection->index(['is_custom', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mongodb')->table('exercises', function (Blueprint $collection) {
            $collection->dropIndexIfExists('is_custom_1_name_1');
        });
    }
};
