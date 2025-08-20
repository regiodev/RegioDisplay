plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    // --- MODIFICARE 1: S-a corectat namespace-ul pentru a se potrivi cu structura finală ---
    namespace = "ro.regio_cloud.display"
    compileSdk = 35

    defaultConfig {
        // --- MODIFICARE 2: S-a înlocuit applicationId generic cu cel final și unic ---
        applicationId = "ro.regio_cloud.display"
        minSdk = 21
        targetSdk = 35
        versionCode = 10
        versionName = "2.2.2"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    packaging {
        jniLibs {
            useLegacyPackaging = false
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.10"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Nucleu Android și Lifecycle
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.3")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("com.google.android.play:app-update-ktx:2.1.0")

    // Redare Media: ExoPlayer (Media3)
    implementation("androidx.media3:media3-exoplayer:1.3.1")
    implementation("androidx.media3:media3-ui:1.3.1")
    // --- MODIFICARE: Adăugăm dependența pentru efecte ---
    implementation("androidx.media3:media3-effect:1.3.1")

    // Jetpack Compose & TV Material Design
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended-android:1.6.8")
    implementation("androidx.tv:tv-foundation:1.0.0-alpha11")
    implementation("androidx.tv:tv-material:1.0.0-beta01")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.3")

    // WorkManager pentru task-uri în fundal
    implementation("androidx.work:work-runtime-ktx:2.9.0")

    // DataStore pentru preferințe
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Rețea: Retrofit, OkHttp (pentru WebSockets) și Gson
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.10.1")

    // Redare Media: ExoPlayer (Media3)
    implementation("androidx.media3:media3-exoplayer:1.3.1")
    implementation("androidx.media3:media3-ui:1.3.1")

    // Încărcare Imagini: Coil
    implementation("io.coil-kt:coil-compose:2.6.0")
    implementation(libs.appcompat)
    
    // --- DEPENDINȚĂ NOUĂ PENTRU WEBVIEW ---
    implementation("androidx.webkit:webkit:1.7.0")

    // Testare
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.06.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}