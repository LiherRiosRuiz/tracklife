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
        // meal_entries: user_id simple + compuesto [user_id, date]
        Schema::connection('mongodb')->table('meal_entries', function (Blueprint $collection) {
            $collection->index('user_id');
            $collection->index(['user_id', 'date']);
        });

        // workouts: user_id simple + compuesto [user_id, date]
        Schema::connection('mongodb')->table('workouts', function (Blueprint $collection) {
            $collection->index('user_id');
            $collection->index(['user_id', 'date']);
        });

        // workout_plans: user_id simple
        Schema::connection('mongodb')->table('workout_plans', function (Blueprint $collection) {
            $collection->index('user_id');
        });

        // activities: user_id simple + compuesto [user_id, date]
        Schema::connection('mongodb')->table('activities', function (Blueprint $collection) {
            $collection->index('user_id');
            $collection->index(['user_id', 'date']);
        });

        // biometric_readings: user_id simple
        Schema::connection('mongodb')->table('biometric_readings', function (Blueprint $collection) {
            $collection->index('user_id');
        });

        // social_posts: user_id simple
        Schema::connection('mongodb')->table('social_posts', function (Blueprint $collection) {
            $collection->index('user_id');
        });

        // challenges: user_id simple
        Schema::connection('mongodb')->table('challenges', function (Blueprint $collection) {
            $collection->index('user_id');
        });

        // wearable_connections: user_id simple
        Schema::connection('mongodb')->table('wearable_connections', function (Blueprint $collection) {
            $collection->index('user_id');
        });

        // products: barcode sparse (no todos los productos tienen barcode)
        Schema::connection('mongodb')->table('products', function (Blueprint $collection) {
            $collection->sparse('barcode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mongodb')->table('meal_entries', function (Blueprint $collection) {
            $collection->dropIndexIfExists('user_id_1');
            $collection->dropIndexIfExists('user_id_1_date_1');
        });

        Schema::connection('mongodb')->table('workouts', function (Blueprint $collection) {
            $collection->dropIndexIfExists('user_id_1');
            $collection->dropIndexIfExists('user_id_1_date_1');
        });

        Schema::connection('mongodb')->table('workout_plans', function (Blueprint $collection) {
            $collection->dropIndexIfExists('user_id_1');
        });

        Schema::connection('mongodb')->table('activities', function (Blueprint $collection) {
            $collection->dropIndexIfExists('user_id_1');
            $collection->dropIndexIfExists('user_id_1_date_1');
        });

        Schema::connection('mongodb')->table('biometric_readings', function (Blueprint $collection) {
            $collection->dropIndexIfExists('user_id_1');
        });

        Schema::connection('mongodb')->table('social_posts', function (Blueprint $collection) {
            $collection->dropIndexIfExists('user_id_1');
        });

        Schema::connection('mongodb')->table('challenges', function (Blueprint $collection) {
            $collection->dropIndexIfExists('user_id_1');
        });

        Schema::connection('mongodb')->table('wearable_connections', function (Blueprint $collection) {
            $collection->dropIndexIfExists('user_id_1');
        });

        Schema::connection('mongodb')->table('products', function (Blueprint $collection) {
            $collection->dropIndexIfExists('barcode_1');
        });
    }
};
