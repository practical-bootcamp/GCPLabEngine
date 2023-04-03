using System.Runtime.Serialization;

namespace Grader.Helper;

// ReSharper disable InconsistentNaming
[DataContract]
public class ServiceAccountKey : JsonBase<ServiceAccountKey>
{
    [DataMember] public string type;
    [DataMember] public string project_id;
    [DataMember] public string private_key_id;
    [DataMember] public string private_key;

    [DataMember] public string client_email;

    [DataMember] public string client_id;
    [DataMember] public string auth_uri;
    [DataMember] public string token_uri;
    [DataMember] public string auth_provider_x509_cert_url;
    [DataMember] public string client_x509_cert_url;
}