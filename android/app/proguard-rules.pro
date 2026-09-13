# Proguard rules for Salaria App
-keepattributes *Annotation*
-keepclassmembers class * {
    @androidx.room.* <methods>;
    @androidx.room.* <fields>;
}
-keep class com.salaria.app.data.model.** { *; }
