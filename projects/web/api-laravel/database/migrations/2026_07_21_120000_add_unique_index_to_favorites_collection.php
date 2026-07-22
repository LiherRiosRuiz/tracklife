<?php

use Illuminate\Database\Migrations\Migration;
use MongoDB\Laravel\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mongodb';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // favorites: unique compuesto [user_id, type, ref] para evitar duplicados
        // por condicion de carrera (dos inserts casi simultaneos del mismo favorito)
        Schema::connection('mongodb')->table('favorites', function (Blueprint $collection) {
            $collection->unique(['user_id', 'type', 'ref']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mongodb')->table('favorites', function (Blueprint $collection) {
            $collection->dropIndexIfExists('user_id_1_type_1_ref_1');
        });
    }
};
