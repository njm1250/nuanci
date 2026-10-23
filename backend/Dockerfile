# 레포 루트에서 빌드한다: docker build -f backend/Dockerfile .
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY backend/ .
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
