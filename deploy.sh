#! /bin/bash
cd cdktf
npm install --global cdktf-cli@latest
npm i
cdktf get
cdktf deploy --auto-approve
terraform output -json -state=terraform.cdktf.tfstate > ../infrastructure.json