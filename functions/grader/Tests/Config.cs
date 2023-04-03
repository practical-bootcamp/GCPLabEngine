using System.IO;
using Google.Apis.Auth.OAuth2;
using NUnit.Framework;

namespace Grader.Helper;

internal class Config
{
    public Config()
    {
        var gcpAuthFilePath = TestContext.Parameters.Get("CredentialsPath", null);        
        var trace = TestContext.Parameters.Get("trace", null);
        TestContext.Out.WriteLine(trace);

        this.Credential = GoogleCredential.FromFile(gcpAuthFilePath!);
        var serviceAccountKey = ServiceAccountKey.FromJson(File.ReadAllText(gcpAuthFilePath!));
        this.ProjectId = serviceAccountKey.project_id;
    }
 
    public string ProjectId { get; }
    public GoogleCredential Credential { get; }
}