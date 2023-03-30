


## Prerequisite
Set up your gcloud cli and set the default project.

```
gcloud auth login --no-launch-browser
gcloud config set project <PROJECT_ID>
gcloud auth application-default login
```


### Congiure 
You need to select a region support all services.

gcloud pubsub topics publish projects/gcplabengine-dev1/topics/start-calendar-event-pubsub-topic --message="Friend"
