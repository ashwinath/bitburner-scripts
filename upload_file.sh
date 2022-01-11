#/bin/bash
set -e

if [ -z ${BITBURNER_TOKEN+x} ]; then
    echo "BITBURNER_TOKEN is not set"
    exit 1
fi

template='{
    "filename": "{FILE_NAME}",
    "code": "{CODE}"
}'
echo ${template} > template.json

# Assume Linux
base64_command="base64 -w 0"
if [ "$(uname)" == "Darwin" ]; then
    base64_command="base64"
fi

ls | grep -E '^.*.js$$' | while read file_name; do 
    code=$(cat ${file_name} | ${base64_command})
    content=$(sed -e "s|{FILE_NAME}|upload/${file_name}|g" -e "s|{CODE}|${code}|g" template.json) 

    curl \
        -H 'Content-Type: application/json' \
        -H "Authorization: Bearer ${BITBURNER_TOKEN}" \
        -d "${content}" \
        "http://${BITBURNER_HOST:-localhost}:9990/"
done

rm template.json
