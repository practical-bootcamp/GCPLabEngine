using System.Threading.Tasks;
using Grader.Helper;
using NUnit.Framework;
using Google.Cloud.Storage.V1;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Grader.Tests;

[GameClass(1), Timeout(Constants.TIMEOUT)]
internal class StorageTest
{
    private Config config;
    private StorageClient client;

    [SetUp]
    public void Setup()
    {
        this.config = new Config();
        this.client = StorageClient.Create(this.config.Credential);
    }
    [Test, GameTask("Create a storage bucket with the name ending in -ivestudent", 3, 10)]
    public void Test01_HaveStorageAccount()
    {
        var buckets = this.client.ListBuckets(config.ProjectId);
        var found = buckets.Any(b => b.Name.EndsWith("-ivestudent"));
        Assert.IsTrue(found, "Could not find a bucket with the name ending in -ivestudent");
    }
}