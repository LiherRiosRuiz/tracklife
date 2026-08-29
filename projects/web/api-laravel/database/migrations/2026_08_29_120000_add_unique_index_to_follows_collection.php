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
        // follows: unique compuesto [follower_id, followed_id] para evitar
        // duplicados por condicion de carrera (dos inserts casi simultaneos
        // del mismo follow).
        Schema::connection('mongodb')->table('follows', function (Blueprint $collection) {
            $collection->unique(['follower_id', 'followed_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mongodb')->table('follows', function (Blueprint $collection) {
            $collection->dropIndexIfExists('follower_id_1_followed_id_1');
        });
    }
};
