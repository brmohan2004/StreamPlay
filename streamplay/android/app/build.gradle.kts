plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.streamplay"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.example.streamplay"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // Signing with debug keys for now so release builds run directly
            signingConfig = signingConfigs.getByName("debug")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    applicationVariants.all {
        val variant = this
        outputs.all {
            val outputImpl = this as? com.android.build.gradle.internal.api.BaseVariantOutputImpl
            if (outputImpl != null) {
                val abiName = outputImpl.getFilter(com.android.build.OutputFile.ABI)
                outputImpl.outputFileName = if (abiName != null) "StreamPlay-$abiName.apk" else "StreamPlay.apk"
            }
        }

        if (variant.buildType.name == "release") {
            variant.assembleProvider.configure {
                doLast {
                    val buildDir = layout.buildDirectory.asFile.get()
                    val releaseDir = File(buildDir, "outputs/apk/release")
                    val flutterApkDir = File(buildDir, "outputs/flutter-apk")
                    flutterApkDir.mkdirs()

                    val arm64 = File(releaseDir, "StreamPlay-arm64-v8a.apk")
                    val universal = File(releaseDir, "StreamPlay.apk")
                    val src = if (arm64.exists()) arm64 else if (universal.exists()) universal else null
                    if (src != null) {
                        src.copyTo(File(flutterApkDir, "StreamPlay.apk"), overwrite = true)
                        src.copyTo(File(flutterApkDir, "StreamPlay-arm64-v8a.apk"), overwrite = true)
                    }
                }
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

tasks.withType<JavaCompile> {
    options.isIncremental = false
}
