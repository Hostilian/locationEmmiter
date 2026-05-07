# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Capacitor rules
-keep public class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin
-keep public class * extends com.getcapacitor.BridgeActivity
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.PluginRequest { *; }
-keep class com.getcapacitor.PluginCall { *; }
-dontwarn com.getcapacitor.android.R$*

# WebKit rules
-keep class android.webkit.** { *; }

# R8 full mode optimizations
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# Preserve line numbers for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Jackson/Gson if used
-dontwarn sun.misc.Unsafe
-keep class com.google.gson.stream.** { *; }

# Kotlin specific
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings {
    <fields>;
}
-keepclassmembers class kotlin.jvm.internal.Reflection {
    <methods>;
}

