using Google.Cloud.Functions.Framework;
using Microsoft.AspNetCore.Http;
using NUnit.Common;
using NUnitLite;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace Grader;

public class Function : IHttpFunction
{
    public async Task HandleAsync(HttpContext context)
    {
        Console.WriteLine("Start");
        HttpRequest request = context.Request;
        var strWriter = new StringWriter();
        var autoRun = new AutoRun();
        string trace = ((string)request.Query["trace"]) ?? "Anonymous";
        string where = ((string)request.Query["where"]) ?? "";
        using TextReader reader = new StreamReader(request.Body);
        string key = await reader.ReadToEndAsync();
        // Console.WriteLine(key);

        var tempDir = Path.GetTempPath();
        var tempCredentialsFilePath = Path.Combine(tempDir, "credentials.json");
        await File.WriteAllTextAsync(tempCredentialsFilePath, key);
        // tempCredentialsFilePath = "/workspaces/GCPLabEngine/functions/grader/key.json";

        var runTestParameters = new List<string>
        {
            "/test:Grader.Tests",
            "--work=" + tempDir,
            "--output=" + tempDir,
            "--err=" + tempDir,
            "--params:CredentialsPath=" + tempCredentialsFilePath + ";trace=" + trace
        };
        if (!string.IsNullOrEmpty(where)) runTestParameters.Insert(1, "--where=" + where);

        Console.WriteLine(runTestParameters);
        var returnCode = autoRun.Execute(runTestParameters.ToArray(), new ExtendedTextWrapper(strWriter), Console.In);
        Console.WriteLine(strWriter.ToString());

        var xml = File.ReadAllText(Path.Combine(tempDir, "TestResult.xml"));
        Console.WriteLine(returnCode);

        context.Response.ContentType = "text/xml";
        await context.Response.WriteAsync(xml);
    }
}